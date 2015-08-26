from pathlib import Path
import csv
from itertools import chain
import subprocess
import shutil

image_dir = Path.cwd().parent / 'images'
image_db = Path.cwd() / 'images.tsv'
image_db_backup = Path.cwd() / 'images.tsv.old'


# Import the image attributes already defined in the database.

images = {}
with image_db.open('rt', encoding = 'utf-8') as f:
    reader = csv.DictReader(f, delimiter = '\t')
    for row in reader:
        images[row['year'] + row['filename']] = row


# Scan through all the images, adding any new ones to the database and updating
# height/width data for existing ones.

png = image_dir.rglob('20*/*.png')
jpg = image_dir.rglob('20*/*.jpg')

found_new = False

for path in chain(png, jpg):
    data = subprocess.check_output(
        ["mediainfo", "--inform=Image;%Width% %Height%", str(path)],
        stderr = subprocess.STDOUT
    ).rstrip().decode('utf-8').split(' ')

    width = int(data[0])
    height = int(data[1])
    filename = path.name
    year = path.parent.name

    is_thumbnail = filename.startswith('tn-')
    if is_thumbnail:
        filename = filename[3:]

    if (year + filename) in images:
        old_image = images[year + filename]

        if is_thumbnail:
            old_image['tn_width'] = width
            old_image['tn_height'] = height
        else:
            old_image['width'] = width
            old_image['height'] = height
    else:
        new_image = {
            'year': year,
            'filename': filename,
            'weight': 1,
            'title': '',
            'description': ''
        }

        if is_thumbnail:
            new_image['tn_width'] = width
            new_image['tn_height'] = height
        else:
            new_image['width'] = width
            new_image['height'] = height

        images[year + filename] = new_image


# Export the updated database.

shutil.copy2(str(image_db), str(image_db_backup))

field_names = [
    'year',
    'filename',
    'weight',
    'width',
    'height',
    'tn_width',
    'tn_height',
    'title',
    'description'
]

with image_db.open('wt', encoding = 'utf-8', newline = '') as f:
    writer = csv.DictWriter(
        f,
        fieldnames = field_names,
        delimiter = '\t',
        quoting = csv.QUOTE_MINIMAL,
        lineterminator = '\n'
    )
    writer.writeheader()

    for image in sorted(images.keys()):
        writer.writerow(images[image])
