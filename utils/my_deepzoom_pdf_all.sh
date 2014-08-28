#!/bin/bash

if [ $# -ne 2 ]; then
	echo "USAGE: `basename "$0"` PATH_TO_PDF_FILE PAGES_NUMBER"
	exit 1
fi

multiply=10

declare -i width=0
declare -i height=0

for page in `seq "$2"`; do
	width=`pdfinfo -box -f $page "$1" | grep MediaBox | awk '{ print int('"$multiply"' * $4) }'`
	height=`pdfinfo -box -f $page "$1" | grep MediaBox | awk '{ print int('"$multiply"' * $5) }'`
	./my_seadragon_pdf.py -W $width -H $height -P $page "$1"
done

