var q = queue()
    .defer(d3.tsv, '../data/games.tsv')
    .defer(d3.tsv, '../data/teams.tsv')
;

q.await(function(error, games, teams) {
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

    // Create data structures holding information about team name changes.

    var teamNormalizer = {};
    var teamAliases = {};

    teams.forEach(function(t) {
        teamNormalizer[t.team] = t.team_normalized;

        if (!(t.team_normalized in teamAliases)) {
            teamAliases[t.team_normalized] = [];
        }
        if (t.team !== t.team_normalized) {
            if (teamAliases[t.team_normalized].indexOf(t.team) === -1) {
                teamAliases[t.team_normalized].push(t.team);
            }
        }
    });

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

        d.opponentNormalized = teamNormalizer[d.opponent];
        d.opponentAliases = teamAliases[d.opponentNormalized];

        if (d.win === true) d.win01 = 1;
        else if (d.win === false) d.win01 = 0;
        else d.win01 = null;

        if (d.forfeit) {
            d.status = 'forfeited';
            d.played = false;
        }

        if (d.home_away === '') {
            d.home_away = 'not recorded';
        }

        d.runs_scored = +d.runs_scored;
        d.runs_allowed = +d.runs_allowed;

        if (d.played) {
            if (d.runs_scored <= 4) d.runsScoredCat = 'Scored 0-4';
            else if (d.runs_scored <= 9) d.runsScoredCat = 'Scored 5-9';
            else if (d.runs_scored <= 14) d.runsScoredCat = 'Scored 10-14';
            else if (d.runs_scored <= 19) d.runsScoredCat = 'Scored 15-19';
            else if (d.runs_scored >= 20) d.runsScoredCat = 'Scored 20+';

            if (d.runs_allowed <= 4) d.runsAllowedCat = 'Allowed 0-4';
            else if (d.runs_allowed <= 9) d.runsAllowedCat = 'Allowed 5-9';
            else if (d.runs_allowed <= 14) d.runsAllowedCat = 'Allowed 10-14';
            else if (d.runs_allowed <= 19) d.runsAllowedCat = 'Allowed 15-19';
            else if (d.runs_allowed >= 20) d.runsAllowedCat = 'Allowed 20+';
        }
        else {
            d.runsScoredCat = 'Not Applicable';
            d.runsAllowedCat = 'Not Applicable';
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
            return d.played || d.forfeit;
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
            if (d.played || d.forfeit) {
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
        .insert('h1', ':first-child')
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
        .filter(function(d) { return d.win01 !== null; })
        .avg('win01')
    ;

    var filters = {};

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
            .renderLabel(true)
            .title(function(d) {
                var title = d.value.sum + ' W';
                title += ', ' + (d.value.count - d.value.sum) + ' L';
                title += ', ' + avgFormat(d.value.avg);
                return title;
            })
            .margins(chartMargins)
        ;

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

            filters[chart.anchorName()] = chart.filters();
            var filteredCharts = d3.keys(filters).filter(function(c) {
                return filters[c].length > 0;
            });
            $('#reset-control').css('visibility', filteredCharts.length > 0 ? 'visible' : 'hidden');
        });

        return chart;
    }

    var charts = [];
    charts.push(addChart('overall'));
    charts.push(addChart('stage', {
        order: function(d) {
            if (d.key === 'regular season') return 1;
            else if (d.key === 'playoffs') return 2;
            return 9;
        },
        label: function(d) {
            return d.key.replace(/\b\w/g, function(m) {
                return m.toUpperCase();
            });
        }
    }));
    charts.push(addChart('opponentNormalized', {
        label: function(d) {
            if (teamAliases[d.key].length > 0) {
                return d.key + ' (' + teamAliases[d.key].join(', ') + ')';
            }
            return d.key;
        }
    }));
    charts.push(addChart('home_away', {
        order: function(d) {
            if (d.key === 'home') return 1;
            else if (d.key === 'away') return 2;
            return 9;
        },
        label: function(d) {
            return d.key.replace(/\b\w/g, function(m) {
                return m.toUpperCase();
            });
        }
    }));
    charts.push(addChart('runsScoredCat', {
        order: function(d) {
            if (d.key === 'Scored 0-4') return 1;
            else if (d.key === 'Scored 5-9') return 2;
            else if (d.key === 'Scored 10-14') return 3;
            else if (d.key === 'Scored 15-19') return 4;
            else if (d.key === 'Scored 20+') return 5;
            return 9;
        }
    }));
    charts.push(addChart('runsAllowedCat', {
        order: function(d) {
            if (d.key === 'Allowed 0-4') return 1;
            else if (d.key === 'Allowed 5-9') return 2;
            else if (d.key === 'Allowed 10-14') return 3;
            else if (d.key === 'Allowed 15-19') return 4;
            else if (d.key === 'Allowed 20+') return 5;
            return 9;
        }
    }));
    charts.push(addChart('year', {
        order: function(d) {
            return -d.key;
        }
    }));
    charts.push(addChart('month', {
        order: function(d) {
            return monthOrder[d.key];
        }
    }));
    charts.push(addChart('weekday', {
        order: function(d) {
            return weekdayOrder[d.key];
        }
    }));
    charts.push(addChart('status', {
        order: function(d) {
            if (d.key === 'played') return 1;
            else if (d.key === 'forfeited') return 2;
            else if (d.key === 'postponed') return 3;
            else if (d.key === 'future') return 4;
            return 9;
        },
        label: function(d) {
            return d.key.replace(/\b\w/g, function(m) {
                return m.toUpperCase();
            });
        }
    }));

    function chartWinPct() {
        charts.forEach(function(chart) {
            chart.valueAccessor(function(d) {
                return d.value.avg;
            })
            .elasticX(false)
            ;

            // Force the x-axis domain to be [0,1]. We also have to explicitly
            // specify the range, because it defaults to [0,1].
            chart.x(
                d3.scale.linear()
                    .domain([0, 1])
                    .range([0, chart.width() - chartMargins.left])
            );
        });
    }

    function chartNumGames() {
        charts.forEach(function(chart) {
            chart.valueAccessor(function(d) {
                return d.value.count;
            })
            .elasticX(true)
            ;
        });
    }

    $('#stat-pct').on('click', function(event) {
        chartWinPct();
        dc.renderAll();
    });

    $('#stat-num').on('click', function(event) {
        chartNumGames();
        dc.renderAll();
    });

    $('#reset-button').on('click', function(event) {
        dc.filterAll();
        dc.renderAll();
        $('#reset-control').css('visibility', 'hidden');
    });

    $('#stat-pct').trigger('click');
});
