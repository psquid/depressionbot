var quotes = function(dbot) {
    var quotes = dbot.db.quoteArrs;
    if(!(dbot.db.hasOwnProperty('quoteAliases'))) {
        dbot.db.quoteAliases = {};
    }
    var aliases = dbot.db.quoteAliases;
    var addStack = [];
    var rmAllowed = true;

    // Retrieve a random quote from a given category, interpolating any quote references (~~QUOTE CATEGORY~~) within it
    var interpolatedQuote = function(key, quoteTree) {
        if(quoteTree !== undefined && quoteTree.indexOf(key) != -1) { 
            return ''; 
        } else if(quoteTree === undefined) { 
            quoteTree = [];
        }

        var quoteString = quotes[key].random();

        // Parse quote interpolations
        var quoteRefs = quoteString.match(/~~([\d\w\s-]*)~~/g);
        var thisRef;

        while(quoteRefs && (thisRef = quoteRefs.shift()) !== undefined) {
            var cleanRef = dbot.cleanNick(thisRef.replace(/^~~/,'').replace(/~~$/,'').trim());
            if (quotes.hasOwnProperty(cleanRef)) {
                quoteTree.push(key);
                quoteString = quoteString.replace("~~" + cleanRef + "~~", 
                        interpolatedQuote(cleanRef, quoteTree.slice()));
                quoteTree.pop();
            }
        }

        // Parse quote parameters
        /*
        var paramRefs = quoteString.match(/~~\$([1-9])~~/g);
        var thisParam;

        while(paramRefs && (thisParam = paramRefs.shift()) !== undefined) {
            thisParam = thisParam[1];
            console.log(thisParam);
            if(thisParam < params.length) {
                quoteString = quoteString.replace("~~$" + thisParam + "~~", params[thisParam]);
            }
        }
        */

        return quoteString;
    };

    var commands = {
        '~q': function(data, params) { 
            var q = data.message.valMatch(/^~q ([\d\w\s-]*)/, 2);
            if(q) {
                q[1] = q[1].trim();
                key = q[1].toLowerCase();
                if(aliases.hasOwnProperty(key)) {
                    key = aliases[key];
                }
                if(quotes.hasOwnProperty(key)) {
                    dbot.say(data.channel, key + ': ' + interpolatedQuote(key));
                } else {
                    dbot.say(data.channel, dbot.strings[dbot.language].category_not_found.format({'category': q[1]}));
                }
            }
        },

        // shows the biggest categories
        '~qstats': function(data, params) {
            var qSizes = []; 
            for(var cat in quotes) {
                if(quotes[cat].length != 0) {
                    qSizes.push([cat, quotes[cat].length]);
                }
            }

            qSizes = qSizes.sort(function(a, b) { return a[1] - b[1]; });
            qSizes = qSizes.slice(qSizes.length - 10).reverse();

            var qString = dbot.strings[dbot.language].large_categories;

            for(var i=0;i<qSizes.length;i++) {
                qString += qSizes[i][0] + " (" + qSizes[i][1] + "), ";
            }

            dbot.say(data.channel, qString.slice(0, -2));
        },
        
        '~qsearch': function(data, params) {
            if(params[2] === undefined) {
                dbot.say(data.channel, dbot.strings[dbot.language].syntax_error);
            } else {
                params[1].trim();
                key = params[1].toLowerCase();
                if(aliases.hasOwnProperty(key)) {
                    dbot.say(data.channel, '\'' + key + '\' is an alias of \'' + aliases[key] + '\'. Search that instead.');
                } else if(!quotes.hasOwnProperty(key)) {
                    dbot.say(data.channel, dbot.strings[dbot.language].empty_category);
                } else {
                    var matches = [];
                    
                    quotes[key].each(function(quote) {
                        if(quote.indexOf(params[2]) != -1) {
                            matches.push(quote);
                        }
                    }.bind(this));

                    if(matches.length == 0) {
                        dbot.say(data.channel, dbot.strings[dbot.language].no_results);
                    } else {
                        dbot.say(data.channel, params[1] + ' (' + params[2] + '): ' + matches.random() + ' [' + matches.length + ' results]');
                    }
                }
            }
        },

        '~rmlast': function(data, params) {
            if(rmAllowed == true || dbot.admin.include(data.user)) {
                var q = data.message.valMatch(/^~rmlast ([\d\w\s-]*)/, 2);
                if(q) {
                    q[1] = q[1].trim()
                    key = q[1].toLowerCase();
                    if(aliases.hasOwnProperty(key)) {
                        key = aliases[key];
                    }
                    if(quotes.hasOwnProperty(key)) {
                        if(!(dbot.db.locks.include(q[1]) || dbot.db.locks.include(key)) || dbot.admin.include(data.user)) {
                            var quote = quotes[key].pop();
                            if(quotes[key].length === 0) {
                                delete quotes[key];
                            }
                            rmAllowed = false;
                            dbot.say(data.channel, '\'' + quote + '\'' + 
                                    dbot.strings[dbot.language].removed_from + q[1]);
                        } else {
                            dbot.say(data.channel, dbot.strings[dbot.language].locked_category.format({'category': q[1]}));
                        }
                    } else {
                        dbot.say(data.channel, dbot.strings[dbot.language].no_quotes.format({'category': q[1]}));
                    }
                } else {
                    var last = addStack.pop();
                    if(last) {
                        if(aliases.hasOwnProperty(last)) {
                            last = aliases[last];
                        }
                        if(!dbot.db.locks.include(last)) {
                            quotes[last].pop();
                            rmAllowed = false;
                            dbot.say(data.channel, dbot.strings[dbot.language].last_removed.format({'category': last}));
                        } else {
                            dbot.say(data.channel, dbot.strings[dbot.language].locked_category.format({'category': last}));
                        }
                    } else {
                        dbot.say(data.channel, dbot.strings[dbot.language].no_recent_adds);
                    }
                }
            } else {
                dbot.say(data.channel, dbot.strings[dbot.language].rmlast_spam);
            }
        },

        '~rm': function(data, params) {
            if(rmAllowed == true || dbot.admin.include(data.user)) {
                var q = data.message.valMatch(/^~rm ([\d\w\s-]*) (.+)$/, 3);
                if(q) {
                    if(quotes.hasOwnProperty(q[1])) {
                        if(!dbot.db.locks.include(q[1])) {
                            var index = quotes[q[1]].indexOf(q[2]);
                            if(index != -1) {
                                quotes[q[1]].splice(index, 1);
                                if(quotes[q[1]].length === 0) {
                                    delete quotes[q[1]];
                                }
                                rmAllowed = false;
                                dbot.say(data.channel, dbot.strings[dbot.language].removed_from.format({'category': q[1], 'quote': q[2]}));
                            } else {
                                dbot.say(data.channel, dbot.strings[dbot.language].q_not_exist_under.format({'category': q[1], 'quote': q[2]}));
                            }
                        } else {
                            dbot.say(data.channel, dbot.strings[dbot.language].locked_category.format({'category': q[1]}));
                        }
                    } else {
                        dbot.say(data.channel, dbot.strings[dbot.language].no_quotes.format({'category': q[1]}));
                    }
                } else {
                    dbot.say(data.channel, dbot.strings[dbot.language].syntax_error);
                }
            } else {
                dbot.say(data.channel, dbot.strings[dbot.language].rmlast_spam);
            }
        },

        '~qcount': function(data, params) {
            var q = data.message.valMatch(/^~qcount ([\d\w\s-]*)/, 2);
            if(q) {
                q[1] = q[1].trim();
                key = q[1].toLowerCase();
                if(quotes.hasOwnProperty(key)) {
                    dbot.say(data.channel, q[1] + ' has ' + quotes[key].length + ' quotes.');
                } else {
                    dbot.say(data.channel, 'No quotes under ' + q[1]);
                }
            } else { // Give total quote count
                var totalQuoteCount = 0;
                for(var category in quotes) {
                    totalQuoteCount += category.length;
                }
                dbot.say(data.channel, dbot.strings[dbot.language].total_quotes.format({'count': totalQuoteCount}));
            }
        },

        '~qadd': function(data, params) {
            var q = data.message.valMatch(/^~qadd ([\d\w\s-]+?)[ ]?=[ ]?(.+)$/, 3);
            if(q) {
                key = q[1].toLowerCase();
                if(aliases.hasOwnProperty(key)) {
                    key = aliases[key];
                }
                if(!Object.isArray(quotes[key])) {
                    quotes[key] = [];
                } else {
                    if (quotes[key].include(q[2])) {
                        dbot.say(data.channel, dbot.strings[dbot.language].quote_exists);
                        return;
                    }
                }
                quotes[key].push(q[2]);
                addStack.push(q[1]);
                rmAllowed = true;
                dbot.say(data.channel, dbot.strings[dbot.language].quote_saved.format({'category': key, 'count': quotes[key].length}));
            } else {
                dbot.say(data.channel, dbot.strings[dbot.language].syntax_error);
            }
        },

        '~qset': function(data, params) {
            var q = data.message.valMatch(/^~qset ([\d\w\s-]*)=(.+)$/, 3);
            if(q) {
                q[1] = q[1].trim();
                key = q[1].toLowerCase();
                if(aliases.hasOwnProperty(key)) {
                    key = aliases[key];
                }
                if(!quotes.hasOwnProperty(key) || (quotes.hasOwnProperty(key) && 
                        quotes[key].length == 1)) {
                    quotes[key] = [q[2]];
                    dbot.say(data.channel, dbot.strings[dbot.language].quote_saved.format({'category': q[1], 'count': 1}));
                } else {
                    dbot.say(data.channel, dbot.strings[dbot.language].quote_replace);
                }
            }
        },

        '~rq': function(data, params) {
            var rQuote = Object.keys(quotes).random();
            dbot.say(data.channel, rQuote + ': ' + interpolatedQuote(rQuote));
        },

        '~d': function(data, params) {
            dbot.say(data.channel,  data.user + ': ' + interpolatedQuote(dbot.name));
        },
        
        '~link': function(data, params) {
            if(params[1] === undefined || !quotes.hasOwnProperty(params[1].toLowerCase())) {
                dbot.say(data.channel, dbot.strings[dbot.language].syntax_error);
            } else {
                dbot.say(data.channel, 'Link to "'+params[1]+'" - http://nc.no.de:443/quotes/'+params[1]);
            }
        },

        '~qprune': function(data) {
            var pruned = []
            for(key in quotes) {
                if(quotes.hasOwnProperty(key)) {
                    if(quotes[key].length == 0) {
                        delete quotes[key];
                        pruned.push(key);
                    }
                }
            }
            if(pruned.length > 0) {
                dbot.say(data.channel, dbot.strings[dbot.language].prune.format({'categories': pruned.join(", ")}));
            } else {
                dbot.say(data.channel, dbot.strings[dbot.language].no_prune);
            }
        },

        '~qalias': function(data) {
            var aliasParams = data.message.valMatch(/^~qalias ([\d\w\s-]*)=([\d\w\s-]*)$/, 3);
            if(!(aliasParams)) {
                dbot.say(data.channel, 'Syntax error. Commence incineration.');
            } else {
                var aSource = dbot.cleanNick(aliasParams[1].toLowerCase());
                var aTarget = dbot.cleanNick(aliasParams[2].toLowerCase());
                if(quotes.hasOwnProperty(aSource)) {
                    dbot.say(data.channel, '\'' + aSource + '\' is already a populated category. Commence incineration.');
                } else {
                    var changeMessage = 'Set \'' + aSource + '\' as an alias of \'' + aTarget + '\'';
                    if(aliases.hasOwnProperty(aSource)) {
                        changeMessage += ' (was previously an alias of \'' + aliases[aSource] + '\').';
                    } else {
                        changeMessage += '.'
                    }
                    aliases[aSource] = aTarget;
                    dbot.say(data.channel, changeMessage);
                }
            }
        },

        '~qunalias': function(data) {
            var unaliasParams = data.message.valMatch(/^~qunalias ([\d\w\s-]*)$/, 2);
            if(!(unaliasParams)) {
                dbot.say(data.channel, 'Syntax error. Commence incineration.');
            } else {
                var aSource = dbot.cleanNick(unaliasParams[1].toLowerCase());
                if (!(aliases.hasOwnProperty(aSource))) {
                    dbot.say(data.channel, '\'' + aSource + '\' is already not an alias of anything!');
                } else {
                    var msg = '\'' + aSource + '\' is no longer an alias of \'' + aliases[aSource] + '\'.';
                    delete aliases[aSource];
                    dbot.say(data.channel, msg);
                }
            }
        }
    };

    return {
        'onLoad': function() {
            dbot.timers.addTimer(1000 * 60 * 3, function() {
                rmAllowed = true;
            });
            return commands;
        },

        // For automatic quote retrieval
        'listener': function(data, params) {
            if(data.user == 'reality') {
                var once = data.message.valMatch(/^I ([\d\w\s,'-]* once)/, 2);
            } else {
                var once = data.message.valMatch(/^reality ([\d\w\s,'-]* once)/, 2);
            }

            if(once) {
                if((dbot.db.bans.hasOwnProperty('~qadd') &&
                dbot.db.bans['~qadd'].include(data.user)) ||
                dbot.db.bans['*'].include(data.user)) {
                    dbot.say(data.channel, data.user + ' is banned from using this command. Commence incineration.'); 
                } else {
                    if(!dbot.db.quoteArrs.hasOwnProperty('realityonce')) {
                        dbot.db.quoteArrs['realityonce'] = [];
                    }
                    dbot.db.quoteArrs['realityonce'].push('reality ' + once[1] + '.');
                    addStack.push('realityonce');
                    rmAllowed = true;
                    dbot.instance.say(data.channel, '\'reality ' + once[1] + '.\' saved.');
                }
            }
        },

        'on': 'PRIVMSG'
    };
};

exports.fetch = function(dbot) {
    return quotes(dbot);
};
