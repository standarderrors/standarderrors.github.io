var q = queue()
    .defer(d3.tsv, '../data/players.tsv')
    .defer(d3.tsv, '../data/images.tsv')
;

q.await(function(error, roster, images) {
    // Function to convert true/false string values to booleans.
    function parseBool(s) {
        if (typeof s === 'string') {
            s = s.trim().toLowerCase();
            switch(s) {
                case 'true': case 'yes': case '1': return true;
                case 'false': case 'no': case '0': case '': return false;
                default: return null;
            }
        }
        return s;
    }

    roster.forEach(function(p) {
        p.year = +p.year;
        p.name = p.first_name + ' ' + p.last_name_normalized;
        p.played = true;
        p.captain = parseBool(p.captain);
        p.exemption = parseBool(p.exemption);
    });

    // Create an array with an element for each year represented in the roster.
    var years = d3.set(
        roster.map(function(p) {
            return p.year;
        }))
        .values()
        .map(function(y) {
            return +y;
        })
        .sort(d3.descending)
    ;

    // Create the main data structure we'll use for the visualization.
    //
    // It will be an array with one element per player. Each element will
    // contain the following attributes:
    //
    // - The player's name.
    //
    // - An array with one element for each year represented on the roster (not
    //   just each year the player played). For example, if the roster spans
    //   2000-2015 and the player played in 2004-2012, then this array will
    //   contain entries for 2000-2015. These array elements will contain all
    //   the attributes from the original input roster data. For years in which
    //   the player didn't play, a dummy element is created.
    //
    // - The "timeline" code.
    //
    // Sort the array by the timeline code (descending). This pulls all current
    // players to the top and gives priority to players who've played many
    // consecutive years.

    var rosterByPlayer = d3.nest()
        .key(function(d) {
            return d.name;
        })
        .entries(roster)
    ;

    rosterByPlayer.forEach(function(d) {
        d.last_name = d.values[0].last_name_normalized;
        d.first_name = d.values[0].first_name;

        d.values = years.map(function(y) {
            var rosterEntry = d.values.filter(function(dy) {
                return dy.year === y;
            });
            if (rosterEntry.length >= 1) {
                return rosterEntry[0];
            }
            else {
                return {
                    name: d.key,
                    year: y,
                    played: false
                }
            }
        }).sort(function(a, b) {
            return d3.descending(a.year, b.year);
        });

        d.timeline = d.values.map(function(dy) {
            if (dy.played) return 1;
            return 0;
        }).join('-');
    });

    rosterByPlayer = rosterByPlayer.sort(function(a, b) {
        return d3.descending(a.timeline, b.timeline) ||
            d3.ascending(a.last_name, b.last_name) ||
            d3.ascending(a.first_name, b.first_name);
    });
    

    //--------------------------------------------------------------------------
    // Create a timeline view of the rosters over time.

    var table = d3.select('#roster-timeline')
        .append('table')
    ;

    var tableHead = table
        .append('thead')
        .append('tr')
    ;

    tableHead
        .selectAll('th')
        .data(['Player'].concat(years))
        .enter()
        .append('th')
        .text(function(d) { return d; })
    ;

    var tableBody = table
        .append('tbody')
    ;

    var tableRows = tableBody
        .selectAll('tr')
        .data(rosterByPlayer)
        .enter()
        .append('tr')
    ;

    tableRows
        .append('th')
        .text(function(d) { return d.key; })
    ;

    tableRows
        .selectAll('td')
        .data(function(d) { return d.values.sort(function(a, b) { return d3.descending(a.year, b.year); }); })
        .enter()
        .append('td')
        .text(function(d) {
            if (d.played) {
                return '◼';
            }
            else {
                return '◻';
            }
        })
    ;
});
