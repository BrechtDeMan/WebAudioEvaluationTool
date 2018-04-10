#!/usr/bin/python
import xml.etree.ElementTree as ET
import os
import sys
import csv
import matplotlib.pyplot as plt
import numpy as np
import scipy as sp
import scipy.stats


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

storage = {"globals":{}, "pages": {}}

def decodeSurveyTree(session_id, surveyroot, store):
    # Get all the children
    for survey_entry in list(surveyroot):
        survey_id = survey_entry.get("ref")
        if survey_id not in store.keys():
            store[survey_id] = {"responses": []}
        survey_type = survey_entry.get("type")
        store[survey_id]["type"] = survey_type
        if survey_type == "statement" or survey_type == "video":
            if "header" not in store[survey_id]:
                store[survey_id]["header"] = ("ids", "duration")
            store[survey_id] = decodeSurveyStatement(session_id, survey_entry, store[survey_id])
        elif survey_type == "question" or survey_type == "number" or survey_type == "slider":
            if "header" not in store[survey_id]:
                store[survey_id]["header"] = ("ids", "durations", "response")
            store[survey_id] = decodeSurveyQuestion(session_id, survey_entry, store[survey_id])
        elif survey_type == "checkbox":
            if "header" not in store[survey_id]:
                head = ["ids", "duration"]
                for option in survey_entry.findall("./response"):
                    head.append(option.get("name"))
                store[survey_id]["header"] = tuple(head)
            store[survey_id] = decodeSurveyCheckbox(session_id, survey_entry, store[survey_id])
        elif survey_type == "radio":
            if "header" not in store[survey_id]:
                store[survey_id]["header"] = ("ids", "duration", "response")
            store[survey_id] = decodeSurveyRadio(session_id, survey_entry, store[survey_id])
    return store

def decodeSurveyStatement(session_id, survey_entry, store):
    resp = (session_id, survey_entry.get("duration"))
    store["responses"].append(resp)
    return store

def decodeSurveyQuestion(session_id, survey_entry, store):
    if survey_entry.find("./response") is not None:
        resp = (session_id, survey_entry.get("duration"), survey_entry.find("./response").text)
    else:
        resp = (session_id, survey_entry.get("duration"), None)
    store["responses"].append(resp)
    return store
    # return None

def decodeSurveyCheckbox(session_id, survey_entry, store):
    response = [session_id, survey_entry.get("duration")]
    for node in survey_entry.findall("./response"):
        response.append(node.get("checked"))
    store["responses"].append(tuple(response))
    return store

def decodeSurveyRadio(session_id, survey_entry, store):
    if survey_entry.find("./response") is not None:
        response = (session_id, survey_entry.get("duration"), survey_entry.find("./response").get("name"))
    else:
        response = (session_id, survey_entry.get("duration"), None)
    store["responses"].append(response)
    return store
    # return None

if folder_name.endswith("/") is False:
    folder_name += "/"

# Create the folder 'surveys' if not yet created
if not os.path.exists(folder_name + 'surveys'):
    os.makedirs(folder_name + 'surveys')

#Iterate through every XML file in folder_name
for file_name in os.listdir(folder_name):
    if file_name.endswith(".xml"):
        tree = ET.parse(folder_name +file_name)
        root = tree.getroot()
        subject_id = root.get('key')
        pre_survey = root.find("./survey[@location='pre']")
        # print pre_survey
        if pre_survey is not None:
            if len(pre_survey) is not 0:
                if "pre" not in storage["globals"].keys():
                    storage["globals"]["pre"] = {}
                storage["globals"]["pre"] = decodeSurveyTree(subject_id, pre_survey, storage["globals"]["pre"])
        post_survey = root.find("./survey[@location='post']")
        if post_survey is not None:
            if len(post_survey) is not 0:
                if "post" not in storage["globals"].keys():
                    storage["globals"]["post"] = {}
                storage["globals"]["post"] = decodeSurveyTree(subject_id, post_survey, storage["globals"]["post"])
        
        # Now iterate through the page specifics
        for page in root.findall("./page[@state='complete']"):
            page_name = page.get("ref")
            pre_survey = page.find("./survey[@location='pre']")
            try:
                page_store = storage["pages"][page_name]
            except KeyError:
                storage["pages"][page_name] = {}
                page_store = storage["pages"][page_name]
            if pre_survey is not None:
                if len(pre_survey) is not 0:
                    if "pre" not in page_store.keys():
                        page_store["pre"] = {}
                    page_store["pre"] = decodeSurveyTree(subject_id, pre_survey, page_store["pre"])
            post_survey = page.find("./survey[@location='post']")
            if post_survey is not None:
                if len(post_survey) is not 0:
                    if "post" not in page_store.keys():
                        page_store["post"] = {}
                    page_store["post"] = decodeSurveyTree(subject_id, post_survey, page_store["post"])

# Storage now holds entire survey structure
# Time to start exporting to files

# Store globals
file_store_root = folder_name + 'surveys/'
for position in storage["globals"].keys():
    for ref in storage["globals"][position].keys():
        with open(file_store_root+ref+".csv", "w") as f:
            filewriter = csv.writer(f, delimiter=",")
            filewriter.writerow(storage["globals"][position][ref]["header"])
            for row in storage["globals"][position][ref]["responses"]:
                filewriter.writerow(row)
for page_name in storage["pages"].keys():
    for position in storage["pages"][page_name].keys():
        if not os.path.exists(file_store_root + page_name):
            os.makedirs(file_store_root + page_name)
        for ref in storage["pages"][page_name][position].keys():
            with open(file_store_root+page_name+"/"+ref+".csv", "w") as f:
                filewriter = csv.writer(f, delimiter=",")
                filewriter.writerow(storage["pages"][page_name][position][ref]["header"])
                for row in storage["pages"][page_name][position][ref]["responses"]:
                    filewriter.writerow(row)

# Time to plot

def plotDurationHistogram(store, plot_id, saveloc):
    x = []
    for row in store["responses"]:
        r_temp = row[1]
        if r_temp  is None:
            r_temp = 0;
        x.append(float(r_temp))
    x = np.asarray(x)
    plt.figure()
    n, bins, patches = plt.hist(x, 10, facecolor='green', alpha=0.75)
    plt.xlabel("Duration")
    plt.ylabel("Count")
    plt.grid(True)
    plt.title("Histogram of durations for "+plot_id)
    plt.savefig(saveloc+plot_id+"-duration.pdf", bbox_inches='tight')

def plotRadio(store, plot_id, saveloc):
    plt.figure()
    data = {}
    for row in store["responses"]:
        try:
            data[row[2]] += 1
        except KeyError:
            data[row[2]] = 1
    labels = data.keys()
    sizes = data.values()
    plt.pie(sizes, labels=labels, autopct='%1.1f%%', startangle=90)
    plt.title("Selections of "+plot_id)
    plt.savefig(saveloc+plot_id+".pdf", bbox_inches='tight')

def plotCheckbox(store, plot_id, saveloc):
    data = []
    labels = []
    for h in store["header"][2::1]:
        labels.append(h)
        data.append(0)
    for row in store["responses"]:
        for i in range(2, len(labels)+2):
            if row[i] == "true":
                data[i-2] += 1
    x = scipy.arange(4)
    plt.figure()
    plt.bar(x, data, width=0.8)
    plt.xticks(x+0.4, labels)
    plt.xlabel("Option")
    plt.ylabel("Count")
    plt.title("Selection counts of "+plot_id)
    plt.savefig(saveloc+plot_id+".pdf", bbox_inches='tight')

for page_name in storage["pages"].keys():
    for position in storage["pages"][page_name].keys():
        saveloc = file_store_root+page_name+"/"
        for ref in storage["pages"][page_name][position].keys():
            plotDurationHistogram(storage["pages"][page_name][position][ref],ref, saveloc)
            if storage["pages"][page_name][position][ref]["type"] == "radio":
                plotRadio(storage["pages"][page_name][position][ref],ref, saveloc)
            if storage["pages"][page_name][position][ref]["type"] == "checkbox":
                plotCheckbox(storage["pages"][page_name][position][ref],ref, saveloc)
