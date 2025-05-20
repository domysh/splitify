#!/usr/bin/env bash

set -xe
mkdir -p build

java -jar /plantuml.jar -o assets/ -charset UTF-8 .
#pdflatex -interaction=nonstopmode -halt-on-error -file-line-error -shell-escape -output-directory=build main.tex
#bibtex build/main
#makeglossaries -d build main
pdflatex -interaction=nonstopmode -halt-on-error -file-line-error -shell-escape -output-directory=build main.tex
pdflatex -interaction=nonstopmode -halt-on-error -file-line-error -shell-escape -output-directory=build main.tex

mv build/main.pdf .
