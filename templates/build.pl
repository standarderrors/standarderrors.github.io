#!/usr/bin/perl

use strict;
use warnings;
use English;

use HTML::Template;


my $dir_template = ".";
my $dir_output = "..";

my @pages = (
             { name => "index",    title => "Standard Errors Archives" },
             { name => "results",  title => "Standard Errors Archives: Results" },
             { name => "rosters",  title => "Standard Errors Archives: Rosters" },
             { name => "photos",   title => "Standard Errors Archives: Photos" },
             { name => "uniforms", title => "Standard Errors Archives: Uniforms" }
             );

foreach my $page (@pages) {
  my $name = $page->{name};
  my $title = $page->{title};

  my $template = HTML::Template->new(filename => "$dir_template/$name.thtml", die_on_bad_params => 0);
  $template->param(title => $title, "$name" => 1);

  my $outfile = "$dir_output/$name.html";
  open(my $fh, ">", $outfile) or die "Cannot write file $outfile : $OS_ERROR\n";
  print $fh $template->output;
  close($fh);
}


exit 0;
