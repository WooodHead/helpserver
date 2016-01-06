// Set up standard page elements...
var helpServer = {
    navigateClosestTopic: function (topic) {
        var fromPath = window.location.pathname;
        var pagesAt = fromPath.indexOf("/pages");
        if (pagesAt >= 0) {
            fromPath = fromPath.substring(pagesAt + 6);
        }
        alert('Find closest text=' + topic + "&from=" + fromPath);
    },
    checkNavigation: function (navToId,from) {
        var fromPath = window.location.pathname;
        var pagesAt = fromPath.indexOf("/pages");
        if (pagesAt >= 0) {
            fromPath = fromPath.substring(pagesAt + 6);
            navToId = fromPath + navToId
        }        
        window.location = navToId;
    }
}
var tableOfContents = {
    tocEle: null,
    pendingTocData: null,
    anchorPrefix: "",
    getAnchorPrefix: function() {
        var prefix = tableOfContents.anchorPrefix;
        if (!prefix) {
            var pagesAt = window.location.pathname.indexOf("/pages");
            if (pagesAt >= 0) {
                prefix = window.location.pathname.substring(0, pagesAt + 6);
                tableOfContents.anchorPrefix = prefix; 
            }
        }
        return prefix;
    },    
    populateTree: function (_tocData, pageName) {
        if (!tableOfContents.tocEle) {
            tableOfContents.tocEle = document.getElementById("TOC");
       		tableOfContents.tocEle.addEventListener("click", tableOfContents.tocClickHandler );
        }
        if (tableOfContents.tocEle) {
            var pathOfPage = window.location.pathname;
            var indexOfPages = pathOfPage.indexOf("/pages");
            if( indexOfPages >= 0 ) {
               pathOfPage = pathOfPage.substring(indexOfPages+6);
            }
            pathOfPage = decodeURI(pathOfPage);
            
            var setInitialSelection = function(res) {
                if (res && res.length) {
                    var branchSelected = false;
                    var i;
                    for (i = 0; i < res.length; ++i) {
                        if( res[i].path && res[i].path.length ) {
                            if( pathOfPage == res[i].path ) {
                                res[i].initialSelection = true;
                                branchSelected = true;
                                break;
                            }   
                        }
                        if (res[i].children) {
                            if( setInitialSelection(res[i].children, false) ) {
                                res[i].initialSelection = true;
                                branchSelected = true;
                                break;
                            }
                        }
                    }
                    return branchSelected;
                }
            };
            setInitialSelection(_tocData.children);
            
            var buildTree = function (res, isOpen) {
                if (res && res.length) {
                    var prefix = tableOfContents.getAnchorPrefix();
                    var ulList = isOpen ? "<ul>\n" : "<ul style=\"display:none\">\n";
                    var i;
                    for (i = 0; i < res.length; ++i) {
                        if (res[i].children) {
                            if( res[i].initialSelection ) {
                                ulList += "<li branch=\"true\" class=\"opened\" >";
                            } else {
                                ulList += "<li branch=\"true\" class=\"closed\" >";
                            }
                        } else {
                            ulList += "<li class=\"leaf\" >";
                        }
                        if (res[i].path) {
                            if (res[i].ignoreBreadcrumbs) {
                                if (res[i].hash)
                                    ulList += "<div id=\""+res[i].path + "#" + res[i].hash+"\" ignoreBreadcumbs=\"true\" ><a href=\"" + prefix + res[i].path + "#" + res[i].hash + "\" >" + res[i].title + "</a></div>";
                                else
                                    ulList += "<div id=\""+res[i].path + "#" + res[i].hash+"\" ignoreBreadcumbs=\"true\" ><a href=\"" + prefix + res[i].path + "\" >" + res[i].title + "</a></div>";
                            } else if (res[i].hash)
                                ulList += "<div id=\""+res[i].path + "#" + res[i].hash+"\" ><a href=\"" + prefix + res[i].path + "#" + res[i].hash + "\" >" + res[i].title + "</a></div>";
                            else
                                ulList += "<div id=\""+res[i].path + "#" + res[i].hash+"\" ><a href=\"" + prefix + res[i].path + "\" >" + res[i].title + "</a></div>";
                        } else {
                            ulList += "<div>" + res[i].title + "</div>";
                        }
                        if (res[i].children)
                            ulList += buildTree(res[i].children, res[i].initialSelection ? true : false);
                        ulList += "</li>\n"
                    }
                    ulList += "</ul>\n";
                    return ulList;
                }
                return "";
            };
            tableOfContents.tocEle.innerHTML = buildTree(_tocData.children, true);
            if (window.location.hash != '') {
                var path = window.location.hash.substring(1);
                tableOfContents.setSelectedPage(path);
            }
        } else {
            tableOfContents.pendingTocData = _tocData
        }
    },
    loaded: function () {
        if (tableOfContents.pendingTocData) {
            tableOfContents.populateTree(tableOfContents.pendingTocData);
            tableOfContents.pendingTocData = null;
        }
    },
    search: function () {
        var ele = document.getElementById("searchInput");
        this.searchText = ele.value;
        if (ele.value != '') {
            var command = "/search?limit=50&pattern=" + ele.value;
            var xmlhttp = new XMLHttpRequest();
            xmlhttp.onreadystatechange = function () {
                if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                    var resultList = JSON.parse(xmlhttp.responseText);
                    var html = '';
                    var i;
                    var prefix = tableOfContents.getAnchorPrefix();
                    for (i = 0; i < resultList.length; ++i) {
                        html += "<div><a href=\"" + prefix + resultList[i].path + "\" id=\"search_" + resultList[i].path + "\" class=\"searchUnselected\" "
                        html += ">" + resultList[i].title + "</a></div>";
                    }
                    var headerEle = document.getElementById('header');
                    document.getElementById("searchResults").innerHTML = html;
                }
            };
            xmlhttp.open("GET", command, true);
            xmlhttp.send();
        }
    },
    setSelectedPage: function (navToId) {
        // goto the page
        var navTo = document.getElementById(navToId);
        if (!navTo) {
            navToId = decodeURI(navToId);
            navTo = document.getElementById(navToId);
            if (!navTo) {
                // If link is to folder - lets look for types of index pages...
                if (navToId.lastIndexOf('.') > navToId.lastIndexOf('/')) {
                    navTo = document.getElementById(navToId + "/index.xml");
                    if (navTo)
                        navTo = navToId + "/index.xml";
                    else {
                        navTo = document.getElementById(navToId + "/index.html");
                        if (navTo)
                            navTo = navToId + "/index.html";
                        else {
                            navTo = document.getElementById(navToId + "/index.md");
                            if (navTo)
                                navTo = navToId + "/index.md";
                        }
                    }
                }
            }
        }
        if (!navTo && !tableOfContents.tocData)
            ; // race with TOC load
        else if (navTo && this.lastSelection != navTo) {
            if (this.lastSelection != null) {
                this.lastSelection.className = "";
            }
            navTo.className = "selected";
            var dad = navTo.parentNode;
            while (dad) {
                if (dad.style && dad.style.display == "none") {
                    dad.style.display = "";
                    dad = dad.parentNode;
                    dad.className = "opened";
                }
                dad = dad.parentNode;
            }
            this.lastSelection = navTo;
            if (navTo.scrollIntoViewIfNeeded)
                navTo.scrollIntoViewIfNeeded();
            else
                navTo.scrollIntoView();
            tableOfContents.populateBreadcrumbs();
        }
    },
    tocClickHandler: function (e) {
        if (e.target) {
            if (e.target.id == "TOC") {
                return false;
            } else if (e.target.nodeName == "A") {
                if (e.target.href) {
                    var navToId = e.target.href;
                    tableOfContents.disableScrollTo = e.target;
                    if (helpServer && helpServer.checkNavigation)
                        helpServer.checkNavigation(navToId, 'toc');
                    else
                        window.parent.helpServer.checkNavigation(navToId, 'toc');
                }
            } else if (e.target.nodeName == "DIV") {
                e.target.className = "selected";
            } else if (e.target.nodeName == "LI" && e.target.getAttribute("branch") == "true") {
                var eleB = e.target.lastElementChild;
                if (eleB.style.display == "none") {
                    eleB.style.display = "";
                    e.target.className = "opened";
                } else {
                    eleB.style.display = "none";
                    e.target.className = "closed";
                }
            }
        }
    }
};

function initialize() {
    var toolbarContent = ["	<button id=\"toolbarTOCButton\" onclick=\"document.body.classList.toggle('showTOC',!document.body.classList.contains('showTOC'));\" style=\"position: absolute; left: 18px;\">",
        "		<svg width=\"44\" height=\"44\" xmlns=\"http://www.w3.org/2000/svg\">",
        "			<defs>",
        "				<filter id=\"dropshadow\" height=\"130%\" width=\"130%\">",
        "					<feGaussianBlur in=\"SourceAlpha\" stdDeviation=\"1\"/>",
        "					<feOffset dx=\"0\" dy=\"0\" result=\"offsetblur\"/>",
        "					<feComponentTransfer>",
        "						<feFuncA type=\"linear\" slope=\"1\"/>",
        "					</feComponentTransfer>",
        "					<feMerge> ",
        "						<feMergeNode/>",
        "						<feMergeNode in=\"SourceGraphic\"/>",
        "					</feMerge>",
        "				</filter>",
        "			</defs>",
        "			<path d=\"m 13.014649,15 a 1.0000999,1.0000999 0 1 0 0,2 l 17.970702,0 a 1.0000999,1.0000999 0 1 0 0,-2 l -17.970702,0 z m 0,6 a 1.0000999,1.0000999 0 1 0 0,2 l 17.970702,0 a 1.0000999,1.0000999 0 1 0 0,-2 l -17.970702,0 z m 0,6 a 1.0000999,1.0000999 0 1 0 0,2 l 17.970702,0 a 1.0000999,1.0000999 0 1 0 0,-2 l -17.970702,0 z\" fill=\"#fff\" filter=\"url(#dropshadow)\" />",
        "		</svg>",
        "	</button>",
        "	<button onclick=\"document.body.classList.add('search'); document.getElementById('searchInput').focus()\"  style=\"position: absolute; right: 18px;\">",
        "		<svg width=\"44\" height=\"44\" xmlns=\"http://www.w3.org/2000/svg\">",
        "			<defs>",
        "				<filter id=\"dropshadow\" height=\"130%\" width=\"130%\">",
        "					<feGaussianBlur in=\"SourceAlpha\" stdDeviation=\"1\"/>",
        "					<feOffset dx=\"0\" dy=\"0\" result=\"offsetblur\"/>",
        "					<feComponentTransfer>",
        "						<feFuncA type=\"linear\" slope=\"1\"/>",
        "					</feComponentTransfer>",
        "					<feMerge>",
        "						<feMergeNode/>",
        "						<feMergeNode in=\"SourceGraphic\"/>",
        "					</feMerge>",
        "				</filter>",
        "			</defs>",
        "			<path d=\"m 20.741949,11.740364 c -4.406433,0 -8,3.593567 -8,8 0,4.406433 3.593567,8 8,8 1.561891,0 3.016201,-0.459127 4.25,-1.238281 l 4.482422,5.378906 a 1.0001,1.0001 0 1 0 1.535156,-1.28125 l -4.470703,-5.365234 c 1.361245,-1.43534 2.203125,-3.367695 2.203125,-5.494141 0,-4.406433 -3.593567,-8 -8,-8 z m 0,2 c 3.325553,0 6,2.674447 6,6 0,3.325553 -2.674447,6 -6,6 -3.325553,0 -6,-2.674447 -6,-6 0,-3.325553 2.674447,-6 6,-6 z\" fill=\"#fff\" filter=\"url(#dropshadow)\" />",
        "		</svg>",
        "	</button>"
    ].join("\n");
    var toolbarEle = document.getElementById("toolbar");
    toolbarEle.innerHTML = toolbarContent;

    var toTopButtonContent = [
        "	<svg width=\"44\" height=\"44\" xmlns=\"http://www.w3.org/2000/svg\">",
        "		<defs>",
        "			<filter id=\"dropshadow\" height=\"130%\" width=\"130%\">",
        "				<feGaussianBlur in=\"SourceAlpha\" stdDeviation=\"1\"/>",
        "				<feOffset dx=\"0\" dy=\"0\" result=\"offsetblur\"/>",
        "				<feComponentTransfer>",
        "					<feFuncA type=\"linear\" slope=\"1\"/>",
        "				</feComponentTransfer>",
        "				<feMerge>",
        "					<feMergeNode/>",
        "					<feMergeNode in=\"SourceGraphic\"/>",
        "				</feMerge>",
        "			</filter>",
        "		</defs>",
        "		<path d=\"m 21.988281,18.201172 a 1.0001015,1.0001015 0 0 0 -0.697265,0.294922 l -5.5625,5.585937 a 1.0005858,1.0005858 0 1 0 1.417968,1.41211 L 22,20.621094 l 4.853516,4.873047 a 1.0005858,1.0005858 0 1 0 1.417968,-1.41211 l -5.5625,-5.585937 a 1.0001015,1.0001015 0 0 0 -0.720703,-0.294922 z\" fill=\"#fff\" filter=\"url(#dropshadow)\" />",
        "	</svg>"
    ].join("\n");
    var toTopButtonEle = document.getElementById("toTopButton");
    toTopButtonEle.innerHTML = toTopButtonContent;

    var searchContent = ["	<div id=\"searchToolbar\">",
        "		<div id=\"searchField\"><input id=\"searchInput\" placeholder=\"Search...\" onkeyup=\"var keyCode = event.charCode || event.keyCode; if(keyCode == 13){ tableOfContents.search();} else if(keyCode == 27){ tableOfContents.searchClear();}\" /></div>",
        "		<button id=\"searchButton\" onclick=\"tableOfContents.search();\" >Search</button>",
        "		<button id=\"searchClose\" onclick=\"document.body.classList.remove('search');\">",
        "			<svg width=\"44\" height=\"44\" xmlns=\"http://www.w3.org/2000/svg\">",
        "				<defs>",
        "					<filter id=\"dropshadow\" height=\"130%\" width=\"130%\">",
        "						<feGaussianBlur in=\"SourceAlpha\" stdDeviation=\"1\"/>",
        "						<feOffset dx=\"0\" dy=\"0\" result=\"offsetblur\"/>",
        "						<feComponentTransfer>",
        "							<feFuncA type=\"linear\" slope=\"1\"/>",
        "						</feComponentTransfer>",
        "						<feMerge> ",
        "							<feMergeNode/>",
        "							<feMergeNode in=\"SourceGraphic\"/>",
        "						</feMerge>",
        "					</filter>",
        "				</defs>",
        "				<path d=\"m 13,12 a 1.0000999,1.0000999 0 0 0 -0.697266,1.716797 L 20.585938,22 12.302734,30.283203 a 1.0000999,1.0000999 0 1 0 1.414063,1.414063 L 22,23.414062 l 8.283203,8.283204 a 1.0000999,1.0000999 0 1 0 1.414063,-1.414063 L 23.414062,22 31.697266,13.716797 A 1.0000999,1.0000999 0 0 0 30.970703,12 a 1.0000999,1.0000999 0 0 0 -0.6875,0.302734 L 22,20.585938 13.716797,12.302734 A 1.0000999,1.0000999 0 0 0 13,12 Z\" fill=\"#fff\" filter=\"url(#dropshadow)\" />",
        "			</svg>",
        "		</button>",
        "	</div>",
        "	<div id=\"searchResults\">",
        "	</div>"
    ].join("\n");
    var searchEle = document.getElementById("search");
    searchEle.innerHTML = searchContent;
    tableOfContents.loaded();

};
