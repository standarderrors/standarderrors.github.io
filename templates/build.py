from pathlib import Path
from jinja2 import Environment, FileSystemLoader

template_dir = Path.cwd()
output_dir = Path.cwd().parent

env = Environment(loader = FileSystemLoader(searchpath = str(template_dir)))

views = [
    'index'
]

for view in views:
    template = env.get_template(view + '.thtml')
    output_path = (output_dir / view).with_suffix('.html')

    with output_path.open('w', newline = '\n') as fh:
        fh.write(template.render())
