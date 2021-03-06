/**
 * Incrementally update the search index (plain text) for the help system
 */
module.exports = function(config, callback) {
    var async = require('async');
    var pageProcessor = require('./pageprocess');
    var fs = require('fs');
    var inputFilesList = config.generated + config.flatfile;
    var plainTextPath = config.generated + "plaintext/";
    var outputFilesList = plainTextPath + "filelist.json";
    var outputPublish = plainTextPath + "publish.json";
    var publishList = [];
    var callStatus = { converted: 0, errors: 0, errorList: [] };
    var ProgressBar = require('progress');
    if (!config.search && !config.metadata && !config.dependencies) {
        callback(new Error('Cannot create index without search configuration'), null);
        return;
    }
    if (!config.search) {
        // just doing dependencies and metatags
        var publishIndexDriver = function(config, callback, changed) {
            callback(null, { updated: true, reindexed: false });
        }
    } else if (config.search.provider === 'elasticsearch') {
        if (config.external) {
            var externalPublish = function(err, stats) {
                var externalUpdate = require("./externalUpdate");
                console.log("Doing external update");
                externalUpdate(config, function(err2, stats2) {
                    console.log("Coming back from external Update");
                    callback(err, stats);
                });
            };
            var publishIndexDriver = function(config, callback, changed) {
                var elasticpublish = require("./elasticpublish");
                if (changed) {
                    elasticpublish(config, externalPublish);
                } else {
                    externalPublish(null, { updated: true, reindexed: false });
                }
            };
        } else {
            var publishIndexDriver = function(config, callback, changed) {
                var elasticpublish = require("./elasticpublish", changed);
                if (changed) {
                    elasticpublish(config, callback);
                } else {
                    callback(null, { updated: true, reindexed: false });
                }
            };
        }
    } else {
        callback(new Error('Search provider ' + config.search.provider + ' is not supported.'), null);
    }
    fs.readFile(inputFilesList, "utf8", function(err, listData) {
        var list = JSON.parse(listData);
        fs.readFile(outputFilesList, "utf8", function(err, listData2) {
            var times = {};
            try {
                times = JSON.parse(listData2);
            } catch (err) {;
            }
            var i;
            var changed = [];
            var timeSrc = {};
            var deletedPages = [];
            var timeId;

            for (i = 0; i < list.length; ++i) {
                if (times[list[i].path] != list[i].mtime) {
                    if (times[list[i].title] != list[i].mtime) {
                        changed.push(list[i]);
                    }
                }
            }
            for (i = 0; i < list.length; ++i)
                timeSrc[list[i].path] = list[i].mtime;

            // List to delete	
            for (timeId in times) {
                if (!timeSrc[timeId]) {
                    deletedPages.push(timeId);
                }
            }
            if (changed.length > 0 || deletedPages.length > 0) {
                console.log("Changes\n\n" + JSON.stringify(changed, null, "\t"));

                fs.writeFile(outputFilesList, JSON.stringify(timeSrc), function(err) {
                    var bar = null;
                    if (changed.length > 0 || deletedPages.length > 0) {
                        bar = new ProgressBar('  building ' + changed.length + ' plaintext files [:bar] :percent :etas', {
                            complete: '=',
                            incomplete: ' ',
                            width: 20,
                            total: changed.length
                        });
                        async.eachSeries(changed, function(fo, callbackLoop) {
                            bar.tick();
                            fs.readFile(fo.file, function(err, data) {
                                if (err) {
                                    callStatus.errors++;
                                    callStatus.errorList.push({ file: fo.file, error: err });
                                    callbackLoop();
                                } else {
                                    pageProcessor(config, data, fo, function(err, textfilename) {
                                        if (err) {
                                            callStatus.errors++;
                                            callStatus.errorList.push({ file: textfilename, error: err });
                                        } else {
                                            callStatus.converted++;
                                        }
                                        if (fo.toc) {
                                            if (fo.description) {
                                                publishList.push({ title: fo.title, description: fo.description, path: fo.path, metadata: fo.metadata, toc: fo.toc });
                                            } else {
                                                publishList.push({ title: fo.title, path: fo.path, metadata: fo.metadata, toc: fo.toc });
                                            }
                                        } else if (fo.description) {
                                            publishList.push({ title: fo.title, description: fo.description, path: fo.path, metadata: fo.metadata });
                                        } else {
                                            publishList.push({ title: fo.title, path: fo.path, metadata: fo.metadata });
                                        }
                                        callbackLoop();
                                    });
                                }
                            });
                        }, function() {
                            // Add deletions (if there are any)
                            var i;
                            if (deletedPages.length > 0) {
                                for (i = 0; i < deletedPages.length; ++i) {
                                    publishList.push({ path: deletedPages[i], isDelete: true });
                                }
                            }
                            fs.writeFile(outputPublish, JSON.stringify(publishList), function(err) {
                                publishIndexDriver(config, callback, true);
                            });
                        });
                    } else {
                        fs.writeFile(outputPublish, JSON.stringify(publishList), function(err) {
                            publishIndexDriver(config, callback, true);
                        });
                    }
                });
            } else {
                publishIndexDriver(config, callback, false);
            }
        });
    });
}