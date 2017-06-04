import datetime
import csv

outcomes = {
    'w': 'win',
    'l': 'loss',
    't': 'tie'
}

home_away = {
    'h': 'home',
    'a': 'away',
    '': None
}

input = []
with open('games_input.tsv', 'rt', newline = '', encoding='utf-8') as f:
    reader = csv.DictReader(f, dialect = 'excel-tab')
    for row in reader:
        input.append(row)

games = []

for i in input:
    g = {}

    g['year'] = int(i['year'])
    g['datetime'] = datetime.datetime(
        year = int(i['year']),
        month = int(i['month']),
        day = int(i['day']),
        hour = int(i['hour']),
        minute = int(i['minute']),
    )

    g['opponent'] = i['opponent']

    g['playoffs'] = i['playoffs'].lower() == 'y'
    g['regular_season'] = not g['playoffs']
    if g['playoffs']:
        g['stage'] = 'playoffs'
        g['seed'] = int(i['seed']) if i['seed'] != '' else None
        g['opponent_seed'] = int(i['opponent_seed']) if i['opponent_seed'] != '' else None
    else:
        g['stage'] = 'regular season'
        g['seed'] = None
        g['opponent_seed'] = None

    g['home_away'] = home_away[i['home_away'].lower()]
    if g['home_away'] in ['home', 'away']:
        g['home'] = g['home_away'] == 'home'
        g['away'] = g['home_away'] == 'away'
    else:
        g['home'] = None
        g['away'] = None

    g['postponed'] = i['postponed'].lower() == 'y'
    g['played'] = i['outcome'] != ''
    g['future'] = not(g['played'] or g['postponed'])
    if g['played']: g['status'] = 'played'
    elif g['postponed']: g['status'] = 'postponed'
    elif g['future']: g['status'] = 'future'

    if g['postponed'] and i['resched_month'] != '' and i['resched_day'] != '':
        g['new_date'] = datetime.date(int(i['year']), int(i['resched_month']), int(i['resched_day']))
    else:
        g['new_date'] = None

    if g['played']:
        g['outcome'] = outcomes[i['outcome'].lower()]
        g['win'] = g['outcome'] == 'win'
        g['loss'] = g['outcome'] == 'loss'
        g['tie'] = g['outcome'] == 'tie'
        g['forfeit'] = i['forfeit'].lower() == 'y'
        g['runs_scored'] = int(i['runs_scored'])
        g['runs_allowed'] = int(i['runs_allowed'])
    else:
        g['outcome'] = None
        g['win'] = None
        g['loss'] = None
        g['tie'] = None
        g['forfeit'] = None
        g['runs_scored'] = None
        g['runs_allowed'] = None

    g['note'] = i['note']

    games.append(g)

games = sorted(games, key = lambda g: g['datetime'])

fields = [
    'year',
    'datetime',
    'stage',
    'regular_season',
    'playoffs',
    'opponent',
    'seed',
    'opponent_seed',
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

with open('games.tsv', 'wt', newline = '', encoding = 'utf-8') as f:
    writer = csv.DictWriter(f, fields, dialect = 'excel-tab')
    writer.writeheader()
    writer.writerows(games)
