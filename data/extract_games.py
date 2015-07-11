from bs4 import BeautifulSoup
import re
from datetime import datetime
from pprint import pprint
import csv

outcomes = {
    'W': 'win',
    'L': 'loss',
    'T': 'tie'
}

with open("../templates/results.thtml") as f:
    results = BeautifulSoup(f)

games = []

tables = [c.parent for c in results.find_all("caption", text = re.compile("\d+ results"))]

for t in tables:
    m = re.match(r'(\d+) results', t.caption.string)
    if m:
        year = int(m.group(1))
    else:
        continue

    for collection in t.find_all("tbody"):
        stage = collection['class']
        records = [tr for tr in collection.find_all("tr") if tr.get("class") is None or "subhead" not in tr.get("class")]

        for record in records:
            game = {}

            if 'regular_season' in stage:
                game['stage'] = 'regular season'
            elif 'tournament' in stage:
                game['stage'] = 'playoffs'
            else:
                print("ERROR: Unexpected value for stage: ", stage)

            columns = [td.string for td in record.find_all("td")]
            field_date = columns[0]
            field_opponent = columns[1]
            field_outcome = columns[2]

            try:
                game['date'] = datetime.strptime(field_date + ", " + str(year), "%A, %B %d, %Y").date()
            except(ValueError):
                game['date'] = datetime.strptime(field_date + ", " + str(year), "%B %d, %Y").date()

            m = re.match(r'(@?) ?(.+)', field_opponent)
            if m:
                game['home'] = m.group(1) != '@'
                game['opponent'] = m.group(2)
            else:
                print("Unparsed opponent field: " + field_opponent)

            if record.get("class") is not None and "ppd" in record.get("class"):
                game['status'] = 'postponed'
                m = re.match(r'PPD \((.*)\) to (\w+ \d+)', field_outcome)
                if m:
                    game['note'] = m.group(1)
                    game['new_date'] = datetime.strptime(m.group(2) + ", " + str(year), "%B %d, %Y").date()
                else:
                    print("Unparsed outcome field for postponed game: " + field_outcome)
            elif field_outcome is None:
                game['status'] = 'future'
            else:
                game['status'] = 'played'

                m = re.match(r'([WLT]), (\d+)-(\d+)', field_outcome)
                if m:
                    game['outcome'] = outcomes[m.group(1)]
                    game['runs_scored'] = m.group(2)
                    game['runs_allowed'] = m.group(3)
                    if game['outcome'] == 'L':
                        game['runs_scored'], game['runs_allowed'] = game['runs_allowed'], game['runs_scored']
                    game['forfeit'] = False
                else:
                    m = re.match(r'([WL]), forfeit', field_outcome)
                    if m:
                        game['outcome'] = outcomes[m.group(1)]
                        game['forfeit'] = False
                        game['runs_scored'] = 7  # by definition
                        game['runs_allowed'] = 0 # by definition
                        if game['outcome'] == 'L':
                            game['runs_scored'], game['runs_allowed'] = game['runs_allowed'], game['runs_scored']
                    else:
                        print("Unparsed outcome field for played game: " + field_outcome)

                m = re.search(r'\((.+)\)', field_outcome)
                if m:
                    game['note'] = m.group(1)

            games.append(game)


for game in games:
    # Make sure every game has the same set of fields.
    if 'stage' not in game:
        print("ERROR: Missing stage.")
        pprint(game)
    if 'date' not in game:
        print("ERROR: Missing date.")
        pprint(game)
    if 'home' not in game:
        print("ERROR: Missing home.")
        pprint(game)
    if 'opponent' not in game:
        print("ERROR: Missing opponent.")
        pprint(game)
    if 'status' not in game:
        print("ERROR: Missing status.")
        pprint(game)
    if 'note' not in game:
        game['note'] = None
    if 'new_date' not in game:
        game['new_date'] = None
    if 'outcome' not in game:
        game['outcome'] = None
    if 'forfeit' not in game:
        game['forfeit'] = None
    if 'runs_scored' not in game:
        game['runs_scored'] = None
    if 'runs_allowed' not in game:
        game['runs_allowed'] = None

    # Add some additional fields.
    game['regular_season'] = game['stage'] == 'regular season'
    game['playoffs'] = game['stage'] == 'playoffs'
    game['year'] = game['date'].year
    game['away'] = not game['home']
    game['home_away'] = 'home' if game['home'] else 'away'
    game['played'] = game['status'] == 'played'
    game['postponed'] = game['status'] == 'postponed'
    game['future'] = game['status'] == 'future'
    if game['played']:
        game['win'] = game['outcome'] == 'win'
        game['loss'] = game['outcome'] == 'loss'
        game['tie'] = game['outcome'] == 'tie'
        if game['forfeit'] is None: game['forfeit'] = False

games = sorted(games, key = lambda g: g['date'])

fields = [
    'year',
    'date',
    'stage',
    'regular_season',
    'playoffs',
    'opponent',
    'home_away',
    'home',
    'away',
    'status',
    'played',
    'postponed',
    'future',
    'new_date',
    'outcome',
    'win',
    'loss',
    'tie',
    'forfeit',
    'runs_scored',
    'runs_allowed',
    'note'
]

with open('games.tsv', 'w') as f:
    writer = csv.DictWriter(f, fields, dialect = 'excel-tab')
    writer.writeheader()
    writer.writerows(games)
