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


    //--------------------------------------------------------------------------
    // Create a data structure holding the roster for each year.

    var rosterByYear = d3.nest()
        .key(function(d) {
            return d.year;
        })
        .entries(roster)
        .sort(function(a, b) {
            return d3.descending(a.key, b.key);
        })
    ;


    //--------------------------------------------------------------------------
    // Display the roster for each year.

    var yearDivs = d3.select('#rosters')
        .selectAll('div')
        .data(rosterByYear)
        .enter()
        .append('div')
    ;

    yearDivs.append('h1')
        .text(function(d) {
            return d.key;
        })
    ;

    var playerLists = yearDivs.append('ul')
        .classed('roster-list', true)
    ;

    playerLists
        .selectAll('li')
        .data(function(d) {
            return d.values;
        })
        .enter()
        .append('li')
        .classed('captain', function(d) {
            return d.captain;
        })
        .classed('exemption', function(d) {
            return d.exemption;
        })
        .text(function(d) {
            var text = d.name;

            if (d.captain) text += ' ★';
            if (d.exemption) text += ' ↲';

            return text;
        })
});
