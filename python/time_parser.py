#!/usr/bin/python

import xml.etree.ElementTree as ET
import os
import sys
import csv
import re

# COMMAND LINE ARGUMENTS

assert len(sys.argv)<3, "score_parser takes at most 1 command line argument\n"+\
                        "Use: python score_parser.py [rating_folder_location]"

# XML results files location
if len(sys.argv) == 1:
    folder_name = "../saves"    # Looks in 'saves/' folder from 'scripts/' folder
    print("Use: python score_parser.py [rating_folder_location]")
    print("Using default path: " + folder_name)
elif len(sys.argv) == 2:
    folder_name = sys.argv[1]   # First command line argument is folder

# check if folder_name exists
if not os.path.exists(folder_name):
    #the file is not there
    print("Folder '"+folder_name+"' does not exist.")
    sys.exit() # terminate script execution
elif not os.access(os.path.dirname(folder_name), os.W_OK):
    #the file does exist but write privileges are not given
    print("No write privileges in folder '"+folder_name+"'.")


# CODE

surveys = {}
pages = {}
tests = list()

# create folder 'timings' if not yet created
if not os.path.exists(folder_name + '/timings'):
    os.makedirs(folder_name + '/timings')

for file_name in os.listdir(folder_name):
    if file_name.endswith(".xml"):
        tree = ET.parse(folder_name + '/' + file_name)
        root = tree.getroot()

        subject_id = root.get('key');
        print(subject_id)

        # get all the survey elements in the root
        for survey in root.findall('survey'):
            if survey.get("state") != "complete":
                break
            for surveyresult in survey.findall('surveyresult'):
                survey_name = surveyresult.get("ref")
                if survey_name is None:
                    break
                if surveys.get(survey_name) is None:
                    surveys[survey_name] = list()
                if surveyresult.get("duration") is None:
                    break
                surveys[survey_name].append(float(surveyresult.get("duration")))

        # get all the pages
        sigma = 0.0
        for page in root.findall('page'):
            page_name = page.get('ref')
            if page_name is None:
                break
            if pages.get(page_name) is None:
                pages[page_name] = list()
            if page.get("state") != "complete":
                break
            metrics = page.find('metric')
            for metric in metrics.findall('metricresult'):
                if metric.get("id") == "testTime":
                    t = float(metric.text)
                    if t is None:
                        t = 0.0
                    sigma = sigma + t
                    pages[page_name].append(t)
        tests.append(sigma)
#print(surveys)
#print(pages)
#print(tests)

if not os.path.exists(folder_name + '/timings/surveys'):
    os.makedirs(folder_name + '/timings/surveys')

if not os.path.exists(folder_name + '/timings/pages'):
    os.makedirs(folder_name + '/timings/pages')

for survey in surveys:
    fname = folder_name + '/timings/surveys/' + survey + ".csv"
    writefile = open(fname, 'w')
    filewriter = csv.writer(writefile, delimiter=',')
    for entry in surveys.get(survey):
        filewriter.writerow([entry])
    writefile.close()

for page in pages:
    print(page)
    fname = folder_name + '/timings/pages/' + page + '.csv'
    writefile = open(fname, 'w')
    filewriter = csv.writer(writefile, delimiter=',')
    for entry in pages.get(page):
        filewriter.writerow([entry])
    writefile.close()

fname = folder_name + '/timings/totals.csv'
writefile = open(fname, 'w')
filewriter = csv.writer(writefile, delimiter=',')
for entry in tests:
    filewriter.writerow([entry])
writefile.close()
