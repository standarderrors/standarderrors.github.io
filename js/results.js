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
        d.new_date = moment(d.new_date, 'YYYY-MM-DD');
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

    var seasonGames = d3.nest()
        .key(function(d) { return d.year; })
        .sortKeys(d3.descending)
        .key(function(d) { return d.stage; })
        .sortKeys(function(a, b) {
            if (a === b) return 0;
            if (a === "regular season") return -1;
            return 1;
        })
        .sortValues(function(a, b) {
            return d3.ascending(a.date, b.date);
        })
        .entries(games)
    ;

    var season = d3.select('#schedule').selectAll('.season')
        .data(seasonGames)
        .enter()
        .append('div')
        .classed('season', true)
    ;

    var stage = season.selectAll('.stage')
        .data(function(d) {
            d.values.forEach(function(v) {
                v.year = d.key;
                v.stage = v.key;
            });
            return d.values;
        })
        .enter()
        .append('div')
    ;

    stage.append('h1')
        .text(function(d) {
            return d.stage + ' ' + d.year;
        })
    ;

    var gameList = stage.append('ul');

    var game = gameList.selectAll('.game')
        .data(function(d) { return d.values; })
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
        .classed('postponed', function(d) {
            return d.postponed;
        })
        .classed('row', true)
    ;

    game
        .append('div')
        .classed('date', true)
        .classed('col-xs-12', true)
        .classed('col-sm-3', true)
        .html(function(d) {
            return d.date.format('ddd, MMM D');
        })
    ;

    game
        .append('div')
        .classed('opponent', true)
        .classed('col-xs-12', true)
        .classed('col-sm-6', true)
        .html(function(d) {
            var opponent = d.opponent;
            if (d.playoffs && d.opponent_seed !== '') {
                opponent = '(' + d.opponent_seed + ') ' + opponent;
            }
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
        .classed('col-sm-3', true)
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
            else if (d.postponed) {
                return 'PPD';
            }
            else {
                return '5:30pm';
            }
        })
    ;

    //----------------------------------------------------------------------
    // Add an icon with a tooltip for any game result notes.

    var notes = d3.select('#schedule').selectAll('.result')
        .filter(function(d) { return d.note !== ''; })
        .append('span')
        .attr('class', 'info-icon glyphicon glyphicon-info-sign')
        .attr('data-toggle', 'tooltip')
        .attr('title', function(d) {
            if (d.postponed) {
                return d.note + ', postponed to ' + d.new_date.format('MMM D');
            }
            return d.note;
        })
        .each(function() {
            // Activate the Bootstrap tooltip.
            $(this).tooltip({
                placement: 'left',
                container: 'body'
            });
        })
    ;
});
