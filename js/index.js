d3.tsv('../data/games.tsv', function(error, games) {
    // Function to convert true/false string values to booleans.
    function parseBool(s) {
        if (typeof s === 'string') {
            s = s.trim().toLowerCase();
            switch(s) {
                case 'true': case 'yes': case '1': return true;
                case 'false': case 'no': case '0': return false;
                default: return null;
            }
        }
        return s;
    }

    games.forEach(function(d) {
        d.date = moment(d.date, 'YYYY-MM-DD');
        d.next = false;

        d.regularSeason = parseBool(d.regular_season);
        d.playoffs = parseBool(d.playoffs);
        d.played = parseBool(d.played);
        d.postponed = parseBool(d.postponed);
        d.future = parseBool(d.future);
        d.home = parseBool(d.home);
        d.away = parseBool(d.away);
        d.win = parseBool(d.win);
        d.loss = parseBool(d.loss);
        d.tie = parseBool(d.tie);
        d.forfeit = parseBool(d.forfeit);
    });

    var now = moment();
    var currentYear = String(now.year());
    var currentGames = games
        .filter(function(d) {
            return d.year === currentYear && !d.postponed;
        })
        .sort(function(a, b) {
            return d3.ascending(a.date, b.date);
        })
    ;

    var futureGames = currentGames.filter(function(d) {
        return d.future;
    });
    if (futureGames.length > 0) {
        futureGames[0].next = true;
    }

    function addGameList(condition, className, title) {
        var listGames = currentGames.filter(condition);
        if (listGames.length === 0) return;

        d3.select('#schedule')
            .append('h1')
            .text(title)
        ;

        var schedule = d3.select('#schedule')
            .append('ul')
            .classed(className, true)
        ;

        var game = schedule.selectAll('.game')
            .data(listGames)
            .enter()
            .append('li')
            .classed('game', true)
            .classed('played', function(d) {
                return d.played;
            })
            .classed('win', function(d) {
                return d.win;
            })
            .classed('loss', function(d) {
                return d.loss;
            })
            .classed('next', function(d) {
                return d.next;
            })
            .classed('row', true)
        ;

        game
            .append('div')
            .classed('date', true)
            .classed('col-xs-12', true)
            .classed('col-md-3', true)
            .html(function(d) {
                return d.date.format('ddd, MMM D');
            })
        ;
        game
            .append('div')
            .classed('opponent', true)
            .classed('col-xs-12', true)
            .classed('col-md-6', true)
            .html(function(d) {
                var opponent = d.opponent;
                if (d.away) {
                    opponent = '@ ' + opponent;
                }
                return opponent;
            })
        ;
        game
            .append('div')
            .classed('result', true)
            .classed('col-xs-12', true)
            .classed('col-md-3', true)
            .html(function(d) {
                if (d.played) {
                    var result = '';
                    if (d.win) {
                        result += 'W, ';
                    }
                    else {
                        result += 'L, ';
                    }
                    if (d.forfeit) {
                        result += 'forfeit';
                    }
                    else {
                        if (d.win) {
                            result += d.runs_scored + '&ndash;' + d.runs_allowed;
                        }
                        else {
                            result += d.runs_allowed + '&ndash;' + d.runs_scored;
                        }
                    }
                    return result;
                }
                else {
                    return '5:30pm';
                }
            })
        ;

        //----------------------------------------------------------------------
        // Add an icon with a tooltip for any game result notes.

        var notes = schedule.selectAll('.result')
            .filter(function(d) { return d.note !== ''; })
            .append('span')
            .attr('class', 'info-icon glyphicon glyphicon-info-sign')
            .attr('data-toggle', 'tooltip')
            .attr('title', function(d) {
                return d.note;
            })
            .each(function() {
                // Activate the Bootstrap tooltip.
                $(this).tooltip({
                    placement: 'right',
                    container: 'body'
                });
            })
        ;
    }

    addGameList(function(d) { return d.next; }, 'next-game', 'Next Game');
    addGameList(function(d) { return d.regularSeason; }, 'regular-season', 'Regular Season ' + currentYear);
    addGameList(function(d) { return d.playoffs; }, 'playoffs', 'Playoffs');
});
