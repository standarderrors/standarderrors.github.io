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

        d.month = d.date.format('MMMM');
        d.weekday = d.date.format('dddd');

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

        if (d.win === true) d.win01 = 1;
        else if (d.win === false) d.win01 = 0;
        else d.win01 = null;

        if (d.home_away === '') {
            d.home_away = 'not recorded';
        }

        d.overall = 'Overall';
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
        .each(function(d) {
            d.li = this;
        })
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


    //----------------------------------------------------------------------
    // Create charts for filtering the game list.

    d3.select('#filters')
        .append('h1')
        .text('Filters / Splits')
    ;

    var monthOrder = {
        January: 0,
        February: 1,
        March: 2,
        April: 3,
        May: 4,
        June: 5,
        July: 6,
        August: 7,
        September: 8,
        October: 9,
        November: 10,
        December: 11,
    };

    var weekdayOrder = {
        Sunday: 0,
        Monday: 1,
        Tuesday: 2,
        Wednesday: 3,
        Thursday: 4,
        Friday: 5,
        Saturday: 6,
    };

    var cf = crossfilter(games);

    var chartWidth = $('#filters').width();
    var chartMargins = {top: 0, right: 10, bottom: 30, left: 10};
    var barHeight = 20;
    var avgFormat = d3.format('.3f');

    var reducer = reductio()
        .avg(function(d) {
            if (d.win) return 1;
            if (d.loss) return 0;
            return null;
        })
    ;

    var reducer = reductio()
        .filter(function(d) { return d.win01 !== null; })
        .avg('win01')
    ;

    function addChart(field, options) {
        if (options === undefined) options = {};

        var divId = 'chart-' + field;
        var div = d3.select('#filters').append('div');
        var dim = cf.dimension(function(d) { return d[field]; });
        var group = reducer(dim.group());
        var chart = dc.rowChart(div.node());
        chart
            .width(chartWidth)
            .height(chartMargins.bottom + group.size() * barHeight + (group.size() + 1) * chart.gap())
            .dimension(dim)
            .group(group)
            .valueAccessor(function(d) {
                return d.value.avg;
            })
            .renderLabel(true)
            .title(function(d) {
                var title = d.value.sum + ' wins';
                title += ', ' + (d.value.count - d.value.sum) + ' losses';
                title += ', ' + avgFormat(d.value.avg);
                return title;
            })
            .margins(chartMargins)
        ;

        // Force the x-axis domain to be [0,1]. We also have to explicitly
        // specify the range, because it defaults to [0,1].
        chart.x(
            d3.scale.linear()
                .domain([0, 1])
                .range([0, chart.width() - chartMargins.left])
        );

        if (options.label) {
            chart.label(options.label);
        }
        if (options.order) {
            chart.ordering(options.order);
        }

        chart.on('filtered', function(chart) {
            filteredGames = dim.top(Infinity);
            games.forEach(function(d) {
                d3.select(d.li).classed('hidden', true);
            });
            filteredGames.forEach(function(d) {
                d3.select(d.li).classed('hidden', false);
            });
        });
    }

    addChart('overall');
    addChart('status');
    addChart('home_away');
    addChart('opponent');
    addChart('stage');
    addChart('year');
    addChart('month', {
        order: function(d) {
            return monthOrder[d.key];
        }
    });
    addChart('weekday', {
        order: function(d) {
            return weekdayOrder[d.key];
        }
    });
    addChart('forfeit');

    dc.renderAll();
});
