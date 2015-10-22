/**
 * Using a flat list of titles, generate an return tree
 */
module.exports = function (config) {
	var nameReplacements = config.escapes;

	function ListUtilities() {
	};

	ListUtilities.prototype.replaceAll = function (str, find, replace) {
		while (str.indexOf(find) >= 0)
			str = str.replace(find, replace);
		return str;
	};

	ListUtilities.prototype.cleanupName = function (name) {
		var i;
		for (i = 0; i < nameReplacements.length; ++i) {
			if (name.indexOf(nameReplacements[i].from) >= 0) {
				name = this.replaceAll(name, nameReplacements[i].from, nameReplacements[i].to);
			}
		}
		return name;
	};
	var removeNumericPrefix = function (title) {
		var length = 1;
		while (length < title.length) {
			var chr = title.substr(length, 1);
			if ('0' <= chr && chr <= '9') {
				++length;
			} else if (chr == '_') {
				++length;
				var newtitle = title.substring(length);
				if (newtitle && newtitle != '')
					title = newtitle;
				break;
			} else {
				break;
			}
		}
		return title;
	};
	ListUtilities.prototype.removeDigitPrefix = function (title) {
		return removeNumericPrefix(title);
	};
	ListUtilities.prototype.sortTree = function (tree) {
		var i = 0;
		for (i = 0; i < tree.length; ++i) {
			if (tree[i].children && tree[i].children.length > 0)
				tree[i].children = this.sortTree(tree[i].children);
		}
		if (tree.length > 1) {
			tree.sort(function compare(a, b) {
				var aTitle = a.title.toLowerCase().trim();
				var bTitle = b.title.toLowerCase().trim();
				if (aTitle < bTitle)
					return -1;
				if (aTitle > bTitle)
					return 1;
				return 0;
			});
		}
		if (tree.length > 0) {
			for (i = 0; i < tree.length; ++i) {
				if (tree[i].title.substr(0, 1) == '_') {
					tree[i].title = removeNumericPrefix(tree[i].title);
				}
			}
		}
		return tree;
	};

	ListUtilities.prototype.expandTocChildren = function (item, list) {
		var output = [];
		var i;
		for (i = 0; i < list.length; ++i) {
			var subitem = list[i];
			var kids = null;
			if (subitem.children) {
				kids = this.expandTocChildren(item, subitem.children);
			}
			if (kids) {
				output.push({ title: subitem.title, hash: subitem.hash, path: item.path, children: kids });
			} else {
				output.push({ title: subitem.title, hash: subitem.hash, path: item.path });
			}
		}
		if (output.length)
			return output;
		return null;
	};

	ListUtilities.prototype.expandSubToc = function (tree) {
		var i = 0;
		// Children first
		for (i = 0; i < tree.length; ++i) {
			if (tree[i].children && tree[i].children.length > 0)
				tree[i].children = this.expandSubToc(tree[i].children);
		}
		// Then this level
		for (i = 0; i < tree.length; ++i) {
			if (tree[i].toc) {
				var thisToc = tree[i].toc;
				tree[i].toc = undefined;
				var tocChildren = this.expandTocChildren(tree[i], thisToc);
				if (tocChildren) {
					if (!tree[i].children)
						tree[i].children = tocChildren;
					else
						tree[i].children = this.mergeNode( tree[i].children.concat(tocChildren) );
				}
			}
		}
		return tree;
	};
	
	ListUtilities.prototype.findNode = function (tree,name) {
		var i;
		for( i = 0 ; i < tree.length ; ++i )
		    if( tree[i].title.trim().toLowerCase() == name )
				return i;
		return -1;
	}
	
	// Remove a node from the tree...
	ListUtilities.prototype.removeNode = function (tree,name) {
		if( name ) {
			var levels = name.split('/');
			if( levels.length > 0 && levels[0] === '' ) {
				levels.splice(0,1);
			}
			if( levels.length > 0 ) {
				var index = this.findNode(tree,levels[0].trim().toLowerCase());
				if( index >= 0 ) {
					if( levels.length > 1 ) {
						if( tree[index].children ) {
							levels.splice(0,1);
							this.removeNode(tree[index].children,levels.join('/'));
						}
					} else {
						tree.splice(index,1);
					}
				}		
			}
		}
		return tree;
	};
	
	// Get a pointer to a node
	ListUtilities.prototype.getNode = function (tree,name) {
		var node = null;
		if( name ) {
			var levels = name.split('/');
			var i;
			for( i = 0 ; i < levels.length ; ++i ) {
				if( levels[i] !== '' ) {
					var index = this.findNode(tree,levels[i].trim().toLowerCase());
					if( index >= 0 ) {
						if(  (i+1) == levels.length ) {
							node = tree[index];
							break;
						} 
						tree = tree[index].children;
					} else {
						break;
					}
				}
			}
		}	
		return node;
	};
	
	ListUtilities.prototype.mergeNode = function (tree) {		
		var i , j;
		for( i = 0 ; i < tree.length ; ++i ) {
		    var itemName = tree[i].title.toLowerCase();
			for( j = tree.length-1 ; j > i ; --j ) {
				if( tree[j].title.toLowerCase() == itemName ) {
					if( !tree[i].path && tree[j].path ) {
						tree[i].path = tree[j].path;
					}
					if( tree[j].children ) {
						if( tree[i].children ) {
							tree[i].children = this.mergeNode( tree[i].children.concat(tree[j].children) );
						} else {
							tree[i].children = tree[j].children;
						}
					}
					tree.splice(j,1);
				}
			}
		}		
		return tree;
	}
	
	ListUtilities.prototype.addNode = function (tree,name,node) {
		var topTree = tree;
		if( name && node ) {
			var levels = name.split('/');
			var i;
			for( i = 0 ; i < levels.length ; ++i ) {
				if( levels[i] !== '' ) {
					var index = this.findNode(tree,levels[i].trim().toLowerCase());
					if( index >= 0 ) {
						if(  (i+1) == levels.length ) {
							// Make sure title gets set (use case of new name)
							tree[index].title = levels[i];
							// Set the path for the node
							if( node.path )
								tree[index].path = node.path;
							// merge any child nodes....	
							if( node.children ) {
								if( tree[index].children )
									tree[index].children = this.mergeNode( tree[index].children.concat(node.children) );
								else
									tree[index].children = node.children;
							}
							break;
						} else {
							if( !tree[index].children )
								tree[index].children = [];
							tree = tree[index].children;					
						} 
					} else if(  (i+1) == levels.length ) {
						node.title = levels[i];
						tree.push(node);
						break;
					} else {
						var newItem = { title : levels[i] , children : [] };
						tree.push(newItem);						
						tree = newItem.children;
					}
				}
			}
		}	
		return topTree;
	};
	
	// Move (or rename) a node ...
	ListUtilities.prototype.moveNode = function (tree,name,newname) {
		if( name ) {
			var levels = name.split('/');
			var newlevels = newname.split('/');
			
			if( levels.length > 0 && levels[0] === '' ) {
				levels.splice(0,1);
			}
			if(  levels.length > 0 ) {
				if( levels[levels.length-1] == '' ) {
					levels.splice(levels.length-1,1);
					if( levels.join() == '' )
					    name = '';
				}
			}
			if( newlevels.length > 0 && newlevels[0] === '' ) {
				newlevels.splice(0,1);
			}
			if(  newlevels.length > 0 ) {
				if( newlevels[newlevels.length-1] == '' ) {
					newlevels.splice(newlevels.length-1,1);
					if( newlevels.join() == '' )
					    newname = '';
				}
			}
			var needToRemoveAndAdd = true;
			// Same number of levels?
			if( levels.length > 0 ) {
				if( levels.length == newlevels.length ) {
					var index = this.findNode(tree,levels[0].trim().toLowerCase());
					if( index >= 0 ) {
						if( levels.length > 1 ) {
							if( levels[0] === newlevels[0] ) {
								// same? it might be a rename...
								levels.splice(0,1);
								newlevels.splice(0,1);							
								tree[index].children = this.moveNode(tree[index].children,levels.join('/'),newlevels.join('/'));
								needToRemoveAndAdd = false;
							}
						} else {
							if( newname.substring(0,1) == '/' && newname.length > 1 ) {
								tree[index].title = newname.substring(1);
							} else {
								tree[index].title = newname;
							}
							tree = this.mergeNode( tree );
							needToRemoveAndAdd = false;
						}
					}
				} 
			}
			if( needToRemoveAndAdd ) {
				// At this point, we need to alter the structure - get the node, remove from hierarchy, then re-insert it.
				var node = this.getNode(tree,name);
				if( node ) {
					tree = this.removeNode(tree,name);
					if( newname ) {
						tree = this.addNode(tree,newname,node);						
					} else if( node.children ) {
						var i;
						for( i = 0 ; i < node.children.length ; ++i ) {
						   tree = this.addNode(tree,node.children[i].title,node.children[i]);
						}												
					}
				}
			}
		}
		return tree;
	};
	ListUtilities.prototype.FlattenBranches = function  (tree,childrenFlatten) {
		var flatTree = [];
		var i;
		if( tree.length <= childrenFlatten ) {
			// If count of entries is under the threshhold, lets re-order the tree 
			for( i = 0 ; i < tree.length ; ++i ) {
				if( tree[i].children && !tree[i].path ) {
					// Merge parents without content into the tree...
					flatTree = flatTree.concat( this.FlattenBranches(tree[i].children,childrenFlatten));
				} else {
					flatTree.push(tree[i]);
				}		
			}
			tree = flatTree;
		} else {
			// Else recurse...
			var needFlattenPass = false;
			for( i = 0 ; i < tree.length ; ++i ) {
				if( tree[i].children ) {
					if( !tree[i].path ) {
						// propogate deep titles on singletons to the top node
						if( tree[i].children.length == 1 ) {
						    var singleTon = tree[i].children[0];
							if( !singleTon.path && singleTon.children ) {
								while( singleTon.children.length == 1 && !singleTon.children[0].path ) {
									singleTon = singleTon.children[0];
								}
								tree[i].title = singleTon.title; 
							}							
						}
					}
					tree[i].children = this.FlattenBranches(tree[i].children,childrenFlatten);
					if( !tree[i].path ) {
						if( tree[i].children.length <= childrenFlatten ) {
							needFlattenPass = true;
						}						
					}
				}
			}
			// And if we find children that can be merged up, do so... 
			if( needFlattenPass ) {
				for( i = 0 ; i < tree.length ; ++i ) {
					if( tree[i].children && tree[i].children.length <= childrenFlatten && !tree[i].path ) {
						// Merge parents without content into the tree...
						flatTree = flatTree.concat( this.FlattenBranches(tree[i].children,childrenFlatten));
					} else {
						flatTree.push(tree[i]);
					}		
				}
				tree = flatTree;				
			}
		}
		return tree;
	}
	// This function will alter a tree structure to match the 'toc' structure - if path is missing, toc entry will be a leaf
	ListUtilities.prototype.EditTreeUsingTOC = function  (tree,toc,topPage) {
		var newTree = toc;
		var listUtil = this;
		var decorateNewTree = function (items) {
			var i;
			for( i = 0 ; i < items.length ; ++i ) {
				if( items[i].hash ) {
					items[i].path = "/"+topPage;
				}
				if( items[i].children ) {
				   if( items[i].childBranch )
				      console.log( "Child branch "+items[i].childBranch+" is not on a leaf - ignored." );
				   decorateNewTree(items[i].children);
				} else if( items[i].childBranch ) {
					var levels = items[i].childBranch.trim().toLowerCase().split('/');
					var j;
					var treeNode = tree;
					for( j = 0 ; j < levels.length ; ++j ) {
						if( levels[j].length > 0 ) {
							var treeNodeIndex = listUtil.findNode(treeNode,levels[j]);
							if( treeNodeIndex >= 0 ) {
							    treeNode = treeNode[treeNodeIndex].children;
						    } else {
								treeNode = null;
								console.log("Not found  "+levels[j]);
							    break;
							}
						}
					}
					if( treeNode ) {
						if( items[i].childFlatten ) {
							items[i].children = listUtil.FlattenBranches(treeNode,items[i].childFlatten);
						} else {
							items[i].children = treeNode;
						}
						console.log("Added child folder "+items[i].childBranch);
					} else {
						console.log("Missing child folder "+items[i].childBranch);
					}
					delete  items[i].childBranch;
				}
				items[i].ignoreBreadcrumbs = true;
			}
		};
		decorateNewTree(newTree);
		//tocStack[tocDepth].push({ title: stringJs(text).decodeHTMLEntities().s, hash: tocHash , childBranch : childBranch });
		return newTree;		
	};	
	/*
	var checkDuplicates = function(tree,message) {
		var i , j;
		var result = false;
		for( i = 0 ; i < tree.length-1 ; ++i ) {
			for( j = i+1 ; j < tree.length ; ++j ) {
				if( tree[i].title == tree[j].title ) {
					result = true;
					console.log('Dups at '+ tree[i].title+" for "+message);
					break;
				}
			}
		} 
		return result;		
	};*/
	
	// Convert a flat list of paths & titles into a 'tree'
	ListUtilities.prototype.treeFromList = function (flatList) {
		var tree = [];
		var i, j, k;
		var currentBranch;
		var hasSubToc = false;

		for (i = 0; i < flatList.length; ++i) {
			var item = flatList[i];
			var levels = item.path.split('/');
			var branch = tree;
			var currentLevel;
			var itemgroup = item.group;
			var itempagename = item.pagename;
			var lastLevel = levels.length;
			if (item.toc) {
				hasSubToc = true;
			}
			if (itemgroup) {
				itemgroup = itemgroup.trim();
				if (itemgroup.substring(0, 1) == '/') {
					var filename = levels[levels.length - 1];
					levels = itemgroup.split('/');
					levels.push(filename);
					lastLevel = levels.length;
					itemgroup = null;
				} else {
					while (itemgroup.substring(0, 3) == "../") {
						itemgroup = itemgroup.substring(3);
						--lastLevel;
					}
					if (itemgroup === "")
						itemgroup = null;
				}
			}
			for (j = 0; j < lastLevel - 1; ++j) {
				currentLevel = this.cleanupName(levels[j]);
				if (currentLevel == '')
					continue;
				currentBranch = null;
				for (k = 0; k < branch.length; ++k) {
					if (branch[k].title == currentLevel) {
						currentBranch = branch[k];
						break;
					}
				}
				if (!currentBranch) {
					currentBranch = { title: currentLevel, children: [] };
					branch.push(currentBranch);
					branch = currentBranch.children;
				} else if (!currentBranch.children) {
					currentBranch.children = [];
					branch = currentBranch.children;
				} else {
					branch = currentBranch.children;
				}
			}
			// Lets skip index.html - these should be brought to the parent node...
			if( item.path.indexOf("/index.html") > 0 ) {
				if( currentBranch ) {
					if( !currentBranch.path ) {
						currentBranch.path = item.path;
					}
				}
				continue;
			}			
			if (itemgroup) {
				var itemGroups = itemgroup.split('/');
				var ig;
				for (ig = 0; ig < itemGroups.length; ++ig) {
					currentBranch = null;
					currentLevel = itemGroups[ig];
					for (k = 0; k < branch.length; ++k) {
						if (branch[k].title == currentLevel) {
							currentBranch = branch[k];
							break;
						}
					}
					if (!currentBranch) {
						currentBranch = { title: currentLevel, children: [] };
						branch.push(currentBranch);
					}
					branch = currentBranch.children;
					if (!branch) {
						currentBranch.children = [];
						branch = currentBranch.children;
					}
				}
				currentBranch = null;
				currentLevel = this.cleanupName(levels[levels.length - 1]);
				for (k = 0; k < branch.length; ++k) {
					if (branch[k].title == currentLevel) {
						currentBranch = branch[k];
						break;
					}
				}
				if (!currentBranch) {
					if (item.toc) {
						if( itempagename ) {
							branch.push({ title: itempagename, path: item.path, toc: item.toc });
						} else {
							branch.push({ title: currentLevel, path: item.path, toc: item.toc });
						}
					} else  if( itempagename ) {
						branch.push({ title: itempagename, path: item.path });
					} else {
						branch.push({ title: currentLevel, path: item.path });
					}
				} else {
					currentBranch.path = item.path;
					if (item.toc) {
						currentBranch.toc = item.toc;
					}
					if( itempagename ) {
						currentBranch.title = itempagename;
					}
				}
			} else if (levels.length > 0) {
				currentBranch = null;
				currentLevel = this.cleanupName(levels[levels.length - 1]);
				for (k = 0; k < branch.length; ++k) {
					if (branch[k].title == currentLevel) {
						currentBranch = branch[k];
						break;
					}
				}
				if (!currentBranch) {
					if (item.toc) {
						if( itempagename ) {
							branch.push({ title: itempagename, path: item.path, toc: item.toc });
						} else {
							branch.push({ title: currentLevel, path: item.path, toc: item.toc });
						}
					} else if( itempagename ) {
						branch.push({ title: itempagename, path: item.path });
					} else {
						branch.push({ title: currentLevel, path: item.path });
					}
				} else {
					currentBranch.path = item.path;
					if (item.toc) {
						currentBranch.toc = item.toc;
					}
					if( itempagename ) {
						currentBranch.title = itempagename;
					}					
				}
			}			
		}
		
		if( config.editTOC ) {
			if( config.editTOC.remove ) {
				// remove list
				for( i = 0 ; i < config.editTOC.remove.length ; ++i ) {
					tree = this.removeNode(tree,config.editTOC.remove[i]);
				}
			}
			if( config.editTOC.move ) {
				// move list
				for( i = 0 ; i < config.editTOC.move.length ; ++i ) {
					tree = this.moveNode(tree,config.editTOC.move[i].from,config.editTOC.move[i].to);
				}
			}
			// Prune empty sections --
			for( i = tree.length-1 ; i >= 0 ; --i ) {
				if( !tree[i].path && !tree[i].toc && !tree[i].children ) {
					tree.splice(i,1);
				} else if( !tree[i].path && !tree[i].toc ) {
					if( tree[i].children.length == 0 )
						 tree.splice(i,1);
				} else if( !tree[i].children ) {
					console.log("Warning - empty branch detected "+tree[i].title);
				}
			}
		}		
		tree = this.sortTree(tree);			
		if (hasSubToc) {
			tree = this.expandSubToc(tree);
		}
		if( config.topPage ) {
			var topPagePath = config.topPage;
			if( topPagePath.substring(0,1) !== "/" )
			    topPagePath = "/" + topPagePath;
			if( config.topPageMetadata && config.topPageMetadata.toc ) {
				// TBD hack the tree....
				console.log("Page content re-organized using TOC from "+config.topPage );
				tree = this.EditTreeUsingTOC(tree,config.topPageMetadata.toc,config.topPage);
			} else {
				console.log("Top page "+config.topPage+" has no TOC");
			}
			return { title : "/" , path : topPagePath , children : tree };
		}
		return { title : "/" , children : tree };
	};

	// Convert a 'tree' into ul list html
	ListUtilities.prototype.treeToUL = function (tree) {
		var buildTree = function (res, isOpen) {
			var ulList = isOpen ? "<ul>\n" : "<ul style=\"display:none\">\n";
			var i;
			for (i = 0; i < res.length; ++i) {
				if (res[i].children) {
					ulList += "<li branch=\"true\" class=\"closed\" >";
				} else {
					ulList += "<li class=\"leaf\" >";
				}
				if (res[i].path) {
					if (res[i].hash)
						ulList += "<div id=\"" + res[i].path + "#" + res[i].hash + "\">" + res[i].title + "</div>";
					else
						ulList += "<div id=\"" + res[i].path + "\">" + res[i].title + "</div>";
				} else {
					ulList += "<div>" + res[i].title + "</div>";
				}
				if (res[i].children)
					ulList += buildTree(res[i].children, false);
				ulList += "</li>\n"
			}
			ulList += "</ul>\n";
			return ulList;
		};
		return buildTree(tree, true);
	};
	ListUtilities.prototype.createIndexPages = function (tree,basePath,suffix) {
      var async = require('async');
	  var indexBuild = [];
	  var fs = require("fs");
	  var lu = this;
 	  var buildIndex = function(items,path) {
		   var i;
		   for( i = 0 ; i < items.length ; ++i ) {
			   if( items[i].children && items[i].children.length > 0 ) {
				   var pathName = path + (items[i].title || ""); 
				   buildIndex( items[i].children , pathName + "/" );
				   if( !items[i].path ) {
				   		items[i].path = pathName ;
				   } 
				   indexBuild.push( { name : pathName , children : items[i].children } );
			   }
		   }
	  };
	  indexBuild.push( { name : "/" , children : tree } ); 
	  buildIndex(tree,"/");
	  		
      async.eachSeries(indexBuild, function (indexEntry, callbackLoop) {
		    var htmlText = "<div id='generatedTopics'>";
			var i , j ;
			var filename = lu.replaceAll( indexEntry.name , "/" , "_" );
			for( i = 0 ; i < indexEntry.children.length ; ++i  ) {
				 var pathName = indexEntry.children[i].path;
				 if( !pathName ) {
					 pathName = indexEntry.name + "/"+ indexEntry.children[i].title;
				 }
				 var extensionIndex = pathName.lastIndexOf('.');
				 if( extensionIndex > 0 && pathName.substr(extensionIndex+1).indexOf('/') < 0 )
					 htmlText += "<a href='"+  pathName +"' >" + indexEntry.children[i].title + "</a>\n";				 
				 else				 
					 htmlText += "<a href='"+  pathName +"' >" + indexEntry.children[i].title + "...</a>\n";				 
			}
			htmlText += "</div>";			
			fs.writeFile( basePath + filename + suffix , htmlText, function (err) {
				callbackLoop();
			});
	  });	
	};
	return new ListUtilities();
}