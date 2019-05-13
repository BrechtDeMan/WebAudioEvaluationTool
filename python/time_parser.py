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

# create folder 'timings' if not yet created
if not os.path.exists(folder_name + '/timings'):
    os.makedirs(folder_name + '/timings')

for file_name in os.listdir(folder_name):
    if file_name.endswith(".xml"):
        tree = ET.parse(folder_name + '/' + file_name)
        root = tree.getroot()

        subject_id = root.get('key');

        # get all the survey elements in the root
        for survey in root.findall('survey'):
            if survey.get("state") == "complete":
                break
            for surveyresult in survey.findall('surveyresult'):
                survey_name = surveyresult.get("ref")
                print(survey_name)
                if survey_name is None:
                    break
                if surveys.get(survey_name) is None:
                    surveys[survey_name] = list()
                print(surveyresult.get("duration"))
                surveys[survey_name].append(surveyresult.get("duration"))

        # get all the pages
        for page in root.findall('page'):
            page_name = page.get('ref')
            if page_name is None:
                break
            if pages.get(page_name) is None:
                pages[page_name] = list()
            if page.get("state") is not "completed":
                break
            metrics = page.find('metric')
            for metric in metrics.findall('metricresult'):
                if metric.get("name") is "testTime":
                    pages[page_name].append(float(metric.text))
print(surveys)
print(pages)
