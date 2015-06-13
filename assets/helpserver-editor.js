var helpEditor = {
	checkedList: [],
	checkedList0: [],
	checkedList1: [],
	keywordsChecked : "" ,
	currentMedataData : null ,
	trackCheckChangedMerge: function () {
		var checked = document.getElementById('checkedStatus');
		this.checkedList = this.checkedList0.concat(this.checkedList1);
		if (helpEditor.checkedList.length > 1)
			checked.innerHTML = helpEditor.checkedList.length + " Items Checked";
		else if (helpEditor.checkedList.length > 0)
			checked.innerHTML = "1 Item Checked";
		else
			checked.innerHTML = "No Items Checked";
	},
	trackCheckChanged: function (list) {
		helpEditor.checkedList0 = list;
		helpEditor.trackCheckChangedMerge();
				},
				trackHREFCheckChange: function (list) {
		helpEditor.checkedList1 = list;
		helpEditor.trackCheckChangedMerge();
				},
				tocLoaded: function () {
		var iframeToc = document.getElementById('toc');
		if (iframeToc) {
			iframeToc.contentWindow.tableOfContents.allowCheck = true;
			iframeToc.contentWindow.tableOfContents.onCheckChanged = this.trackCheckChanged;
		}
				},
				Deselect: function () {
		var iframeToc = document.getElementById('toc');
		if (iframeToc) {
			iframeToc.contentWindow.tableOfContents.DeselectChecked();
		}
	},
	RefreshServer: function (metadata) {
		var xmlhttp = new XMLHttpRequest();
		xmlhttp.onload = function () {
			if (this.status == 200) {
				window.location.reload();
			}
		};
		xmlhttp.open("POST", "/admin/refresh", true);
		xmlhttp.send(JSON.stringify(metadata));
				},
				SetMetadata: function (metadata) {
		if (metadata.pages.length > 0) {
			var xmlhttp = new XMLHttpRequest();
			xmlhttp.onload = function () {
				if (this.status == 200) {
					helpEditor.RefreshServer();
				}
			};
			xmlhttp.open("POST", "/admin/metadata", true);
			xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
			xmlhttp.send(JSON.stringify(metadata));
		} else {
			alert('no pages are checked.');
		}
	},
	ApplyTags: function () {
		var tagNames = document.getElementById('tagNames');
		if (tagNames.value && tagNames.value.length > 0) {
			var tagEdits = { pages: [], patch: true };
			var i;
			var metadata = { tags: tagNames.value };
			if (this.checkedList.length < 1) {
				tableOfContents.selectCurrentTOC();
				tableOfContents.advanceNextTOC();
			}
			for (i = 0; i < this.checkedList.length; ++i) {
				tagEdits.pages.push({ path: this.checkedList[i], metadata: metadata });
			}
			this.SetMetadata(tagEdits);
		} else {
			alert('cannot apply an empty tag');
		}
	},
	ApplyGroup: function () {
		var groupName = document.getElementById('groupName');
		if (groupName.value && groupName.value.length > 0) {
			var tagEdits = { pages: [], patch: true };
			var i;
			var metadata = { group: groupName.value };
			var matchPath = '';
			var pathLen = 0;
			var fullPath = groupName.value;
			if (this.checkedList.length < 1) {
				tableOfContents.selectCurrentTOC();
				tableOfContents.advanceNextTOC();
			}
			if (this.checkedList.length > 0) {
				matchPath = this.checkedList[0];
				pathLen = matchPath.lastIndexOf("/");
				matchPath = matchPath.substring(0, pathLen);
				fullPath = matchPath + '/';
				var gname = groupName.value;
				if (gname.substring(0, 1) == '/') {
					fullPath = gname;
				} else {
					if (gname.substring(0, 3) == '../') {
						while (gname.substring(0, 3) == '../') {
							gname = gname.substring(3);
							fullPath = fullPath.substring(0, fullPath.lastIndexOf('/'));
							fullPath = fullPath.substring(0, fullPath.lastIndexOf('/')) + '/';
						}
					}
					if (gname.length > 0) {
						fullPath += gname;
					}
				}
			}
			var fullyQualifiedMetadata = { group: fullPath };

			for (i = 0; i < this.checkedList.length; ++i) {
				if (i > 0 && ((pathLen != this.checkedList[i].lastIndexOf("/")) || this.checkedList[i].substring(0, pathLen) != matchPath)) {
					tagEdits.pages.push({ path: this.checkedList[i], metadata: fullyQualifiedMetadata });
				} else {
					tagEdits.pages.push({ path: this.checkedList[i], metadata: metadata });
				}
			}
			this.SetMetadata(tagEdits);
		} else {
			alert('cannot apply an empty group');
		}
	},
	ApplyStatus: function () {
		var statusName = document.getElementById('statusName');
		if (statusName.value && statusName.value.length > 0 && statusName.value != 'none' && statusName.value != 'None') {
			var tagEdits = { pages: [], patch: true };
			var i;
			var metadata = { status: statusName.value };
			if (this.checkedList.length < 1) {
				tableOfContents.selectCurrentTOC();
			}
			for (i = 0; i < this.checkedList.length; ++i) {
				tagEdits.pages.push({ path: this.checkedList[i], metadata: metadata });
			}
			this.SetMetadata(tagEdits);
		} else {
			alert('cannot apply an empty status');
		}
	},
	SaveNote: function () {
		var notes = document.getElementById('notes');
		if (notes.value && notes.value.length > 0) {
			var tagEdits = { pages: [], patch: true };
			var i;
			var metadata = { notes: notes.value };
			if (this.checkedList.length < 1) {
				tableOfContents.selectCurrentTOC();
			}
			for (i = 0; i < this.checkedList.length; ++i) {
				tagEdits.pages.push({ path: this.checkedList[i], metadata: metadata });
			}
			this.SetMetadata(tagEdits);
		} else {
			alert('cannot apply an empty notes (use "fixed" if reviewed page was fixed)');
		}
	},
	trackMetaData: function (mdata) {
		var tagNames = document.getElementById('tagNames');
		var groupName = document.getElementById('groupName');
		var statusName = document.getElementById('statusName');
		var pagePath = document.getElementById('pagePath');
		var notes = document.getElementById('notes');
		var kw = document.getElementById('keywords');
		var i;
		helpEditor.currentMedataData = mdata;
		tagNames.value = mdata.tags || "";
		groupName.value = mdata.group || "";
		notes.value = mdata.notes || "";
		statusName.value = mdata.status || "";
		if( kw ) {
			var keywords = mdata.keywords || "";
			for( i = 0 ; i <  kw.children.length ; ++i ) {
				if( kw.children[i].value ) {					
				    if( keywords.indexOf(kw.children[i].value) >= 0 ) {
						kw.children[i].checked = true;
					} else {
						kw.children[i].checked = false;
					} 
				}
			}			
		}
		var levels = helpServer.currentPath.split('/');
		levels.splice(levels.length - 1, 1);
		if (mdata.group && mdata.group != '') {
			var groupName = mdata.group;
			if (groupName.substring(0, 1) == '/') {
				levels = groupName.split('/');
			} else {
				while (groupName.substring(0, 3) == '../') {
					levels.splice(levels.length - 1, 1);
					groupName = groupName.substr(3);
				}
				if (groupName != '')
					levels = levels.concat(groupName.split('/'));
			}
		}
		pagePath.value = decodeURI(levels.join('/'));
				},
			 refreshHelpTopics: function () {
		document.getElementById('refreshButton').innerHTML = "Refreshing...";
		var xmlhttp = new XMLHttpRequest();
		xmlhttp.onload = function () {
			if (this.status == 200) {
				document.getElementById('refreshButton').innerHTML = "Refreshed...";
				window.location.reload();
			}
		};
		xmlhttp.open("POST", "/admin/refresh", true);
		xmlhttp.send('');
	},
	addControls : function() {
		setTimeout(function() {
		var headerDiv = document.getElementById('header');
		var editDiv = document.createElement('div');
		editDiv.id = "editor";
		editDiv.style.height = "120px";
		editDiv.style.position = "absolute";
		editDiv.style.left = "0px";
		editDiv.style.top = "0px";
		editDiv.style.background = "#2c3e50"; 
		headerDiv.appendChild(editDiv);		
		var helpDiv = [			
			'	<div style="float:left;width:107pt;" id="checkedStatus">No Items Checked</div>',
			'	<button id="Deselect" onclick="helpEditor.Deselect()">Deselect</button>&nbsp;Tags&nbsp;',
			'	<input id="tagNames"></input>',
			'	<button id="ApplyTags" onclick="helpEditor.ApplyTags()">Apply Tags</button>&nbsp;Group&nbsp;',
			'	<input id="groupName"></input>',
			'	<button id="ApplyGroup" onclick="helpEditor.ApplyGroup()">Apply Group</button>&nbsp;Notes&nbsp;',
			'	<input id="notes"></input>',
			'	<button id="SaveNote" onclick="helpEditor.SaveNote()">Save Notes</button>',
			'	<br/>',
			'	</div>Page Path &nbsp;',
			'	<input id="pagePath" style="width:5in"></input>',
			'	Status &nbsp;',
			'	<select id="statusName" >',
			'	  <option value="">None</option>',
			'	  <option value="pending">Pending</option>',
			'	  <option value="reject">Reject</option>',
			'	  <option value="accept">Accept</option>',
			'	</select>',
			'	<button id="ApplyStatus" onclick="helpEditor.ApplyStatus()">Apply Status</button>',
			'	<button onclick="helpEditor.refreshHelpTopics()" id="refreshButton" >Refresh ...</button>'].join('\n');
		if( helpServer.config && helpServer.config.keywords ) {
			var i;
			helpDiv += "<br><div id=\"keywords\" onclick=\"helpEditor.keywordsChanged()\" >";
			for( i = 0 ; i < helpServer.config.keywords.length ; ++i ) {
				var  kw = helpServer.config.keywords[i];
				if( i*2 == (helpServer.config.keywords.length & 254) )
					helpDiv += "<br>";	
			    helpDiv += '<input type="checkbox" id="keyword'+kw+'" value="'+kw+'">'+kw+'</input>';
			}
			helpDiv += "<button id=\"ApplyKeywords\" onclick=\"helpEditor.ApplyKeywords()\">Apply Keywords</button></div>";
		} else {
			helpDiv += "<br>No keywords defined";
		}	 			
		editDiv.innerHTML = helpDiv;
		if( helpEditor.currentMedataData ) {
			helpEditor.trackMetaData(helpEditor.currentMedataData);
		}
		},500);
	},
	keywordsChanged :  function() {
		var kw = document.getElementById('keywords');
		var i;
		var keywords = '';
		for ( i = 0 ; i < kw.children.length ; ++i ) {
			if( kw.children[i].checked && kw.children[i].value ) {
				if( keywords.length > 0 )
				   keywords += ",";
				keywords += kw.children[i].value;
			}
		}
		helpEditor.keywordsChecked = keywords;
		if (this.checkedList.length < 1 && tableOfContents.lastSelection ) {
			// Just set the current (don't wait for 'apply')
			var tagEdits = { pages: [], patch: true };
			var metadata = { keywords: helpEditor.keywordsChecked };
			tagEdits.pages.push({ path: tableOfContents.lastSelection.id , metadata: metadata });
			this.SetMetadata(tagEdits);
		}
	},
	ApplyKeywords :  function() {
		var kw = document.getElementById('keywords');
		if( helpEditor.keywordsChecked.length > 0 ) {
			if (this.checkedList.length > 0 ) {
				var tagEdits = { pages: [], patch: true };
				var i;
				var metadata = { keywords: helpEditor.keywordsChecked };
				for (i = 0; i < this.checkedList.length; ++i) {
					tagEdits.pages.push({ path: this.checkedList[i], metadata: metadata });
				}
				this.SetMetadata(tagEdits);
			}
		} else {
			alert('cannot apply an empty keywords');
		}
		
	}	
};
helpServer.trackMetaData = helpEditor.trackMetaData;
helpServer.allowCheck = true;
helpServer.onCheckChanged = function (list) {
	helpEditor.trackHREFCheckChange(list);
}
