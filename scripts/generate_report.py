#!/usr/bin/python
# -*- coding: utf-8 -*-

import xml.etree.ElementTree as ET
import os       # for getting files from directory
import operator # for sorting data with multiple keys
import sys      # for accessing command line arguments
import subprocess # for calling pdflatex
import shlex # for calling pdflatex
import matplotlib.pyplot as plt # plots
import numpy as np # numbers

# Command line arguments
assert len(sys.argv)<3, "evaluation_stats takes at most 1 command line argument\n"+\
                        "Use: python evaluation_stats.py [results_folder]"

# XML results files location
if len(sys.argv) == 1:
    folder_name = "../saves"    # Looks in 'saves/' folder from 'scripts/' folder
    print "Use: python evaluation_stats.py [results_folder]"
    print "Using default path: " + folder_name
elif len(sys.argv) == 2:
    folder_name = sys.argv[1]   # First command line argument is folder

# Turn number of seconds (int) to '[minutes] min [seconds] s' (string)
def seconds2timestr(time_in_seconds):
    time_in_minutes = int(time_in_seconds/60)
    remaining_seconds = int(time_in_seconds%60)
    return str(time_in_minutes) + " min " + str(remaining_seconds) + " s"

# stats initialisation
number_of_XML_files  = 0
number_of_pages      = 0
number_of_fragments  = 0
total_empty_comments = 0
total_not_played     = 0
total_not_moved      = 0
time_per_page_accum  = 0

# arrays initialisation
page_names       = []
page_count       = []
duration_page    = []      # duration of experiment in function of page content
duration_order   = []      # duration of experiment in function of page number
fragments_per_page = []    # number of fragments for corresponding page

# get username if available
for name in ('LOGNAME', 'USER', 'LNAME', 'USERNAME'):
    user = os.environ.get(name)
    if user:
        break
    else:
        user = ''


# begin LaTeX document
header = r'''\documentclass[11pt, oneside]{article} 
          \usepackage{geometry}
          \geometry{letterpaper}
          \usepackage[parfill]{parskip}
          \usepackage{graphicx}
          \title{Report}
          \author{'''+\
          user+\
          r'''}
          \graphicspath{{'''+\
          folder_name+\
          r'''/}}
          \begin{document}
          \maketitle
          \tableofcontents
          '''
          
footer = '\end{document}'

body = ''

# generate images for later use
subprocess.call("timeline_view_movement.py", shell=True)

# get every XML file in folder
files_list = os.listdir(folder_name)
for file in files_list: # iterate over all files in files_list
    if file.endswith(".xml"): # check if XML file
        number_of_XML_files += 1
        tree = ET.parse(folder_name + '/' + file)
        root = tree.getroot()
        
        # PRINT name as section
        body+= '\section{'+file[:-4].capitalize()+'}\n' # make section header from name without extension
        
        # reset for new subject
        total_duration = 0
        page_number = 0
        
        individual_table = '' # table with stats for this individual test file
        
        # get list of all page names
        for audioholder in root.findall("./audioholder"):   # iterate over pages
            page_name = audioholder.get('id')               # get page name
            
            if page_name is None: # ignore 'empty' audio_holders
                print "WARNING: " + file + " contains empty audio holder. (evaluation_stats.py)"
                break # move on to next
            
            number_of_comments = 0 # for this page
            number_of_missing_comments = 0 # for this page
            not_played = 0 # for this page
            not_moved = 0 # for this page
            
            # 'testTime' keeps total duration: subtract time so far for duration of this audioholder
            duration = float(audioholder.find("./metric/metricresult[@id='testTime']").text) - total_duration
            
            # total duration of test
            total_duration += duration
            
            # number of audio elements
            audioelements = audioholder.findall("./audioelement") # get audioelements
            number_of_fragments += len(audioelements) # add length of this list to total
            
            # number of comments (interesting if comments not mandatory)
            for audioelement in audioelements:
                response = audioelement.find("./comment/response")
                was_played = audioelement.find("./metric/metricresult/[@name='elementFlagListenedTo']")
                was_moved = audioelement.find("./metric/metricresult/[@name='elementFlagMoved']")
                if response.text is not None and len(response.text) > 1: 
                    number_of_comments += 1
                else: 
                    number_of_missing_comments += 1
                if was_played is not None and was_played.text == 'false': 
                    not_played += 1
                if was_moved is not None and was_moved.text == 'false': 
                    not_moved += 1
            
            # update global counters
            total_empty_comments += number_of_missing_comments
            total_not_played += not_played
            total_not_moved += not_moved
            
            # PRINT alerts when elements not played or markers not moved
            # number of audio elements not played
            if not_played > 1:
                body += '\\emph{\\textbf{ATTENTION: '+str(not_played)+' fragments were not listened to in '+page_name+'!}} \\\\ \n'
            if not_played == 1: 
                body += '\\emph{\\textbf{ATTENTION: one fragment was not listened to in '+page_name+'!}} \\\\ \n '
            
            # number of audio element markers not moved
            if not_moved > 1:
                body += '\\emph{\\textbf{ATTENTION: '+str(not_moved)+' markers were not moved in '+page_name+'!}} \\\\ \n'
            if not_moved == 1: 
                body += '\\emph{\\textbf{ATTENTION: one marker was not moved in '+page_name+'!}} \\\\ \n'
                
            #TODO which one not moved/listened to? 
            
            # PRINT song-specific statistic
            individual_table += page_name+'&'+\
                                str(number_of_comments) + '/' +\
                                str(number_of_comments+number_of_missing_comments)+'&'+\
                                seconds2timestr(duration)+'\\\\'
            
            # get timeline for this audioholder
            img_path = 'timelines_movement/'+file[:-4]+'-'+page_name+'.pdf'
            
            # check if available
            if os.path.isfile(folder_name+'/'+img_path):
                # SHOW timeline image
                body += r'''\begin{figure}[htbp]
                         \begin{center}
                         \includegraphics[width=\textwidth]{'''+\
                         folder_name+'/'+img_path+\
                        r'''}
                        \caption{Timeline of '''+\
                         page_name+' by '+ file[:-4].capitalize() +\
                        r'''.}
                         \end{center}
                         \end{figure}
                         '''
            
            # keep track of duration in function of page index
            if len(duration_order)>page_number:
                duration_order[page_number].append(duration)
            else:
                duration_order.append([duration])
                
            # keep list of audioholder ids and count how many times each audioholder id
            # was tested, how long it took, and how many fragments there were (if number of 
            # fragments is different, store as different audioholder id)
            if page_name in page_names: 
                page_index = page_names.index(page_name) # get index
                # check if number of audioelements the same
                if len(audioelements) == fragments_per_page[page_index]: 
                    page_count[page_index] += 1
                    duration_page[page_index].append(duration)
                else: # make new entry
                    alt_page_name = page_name+"("+str(len(audioelements))+")"
                    if alt_page_name in page_names: # if already there
                        alt_page_index = page_names.index(alt_page_name) # get index
                        page_count[alt_page_index] += 1
                        duration_page[alt_page_index].append(duration)
                    else: 
                        page_names.append(alt_page_name)
                        page_count.append(1)
                        duration_page.append([duration])
                        fragments_per_page.append(len(audioelements))
            else: 
                page_names.append(page_name)
                page_count.append(1)
                duration_page.append([duration])
                fragments_per_page.append(len(audioelements))
                
            # bookkeeping
            page_number += 1 # increase page count for this specific test
            number_of_pages += 1 # increase total number of pages
            time_per_page_accum += duration # total duration (for average time spent per page)

        # PRINT table with statistics about this test
        body += r'''\begin{tabular}{|p{3.5cm}|c|p{2.5cm}|}
                 \hline
                 \textbf{Song name} & \textbf{Comments} & \textbf{Duration} \\ \hline '''+\
                 individual_table+\
                 r'''\hline
                  \textbf{TOTAL} & & \textbf{'''+\
                  seconds2timestr(total_duration)+\
                 r'''}\\
                  \hline 
                  \end{tabular}'''

# join to footer
footer = body + footer

# empty body again
body = ''

# PRINT summary of everything (at start)
body += '\section{Summary}\n'

# PRINT table with statistics
body += '\\begin{tabular}{ll}'
body += r'Number of XML files: &' + str(number_of_XML_files) + r'\\'
body += r'Number of pages: &' + str(number_of_pages) + r'\\'
body += r'Number of fragments: &' + str(number_of_fragments) + r'\\'
body += r'Number of empty comments: &' + str(total_empty_comments) +\
      " (" + str(round(100.0*total_empty_comments/number_of_fragments,2)) + r"\%)\\"
body += r'Number of unplayed fragments: &' + str(total_not_played) +\
      " (" + str(round(100.0*total_not_played/number_of_fragments,2)) + r"\%)\\"
body += r'Number of unmoved markers: &' + str(total_not_moved) +\
      " (" + str(round(100.0*total_not_moved/number_of_fragments,2)) + r"\%)\\"
body += r'Average time per page: &' + seconds2timestr(time_per_page_accum/number_of_pages) + r"\\"


# Pages and number of times tested
page_count_strings = list(str(x) for x in page_count)
count_list = page_names + page_count_strings
count_list[::2] = page_names
count_list[1::2] = page_count_strings
#body +=  r'Pages tested: &' + str(count_list) + r"\\"

body += '\\end{tabular} \\vspace{1.5cm} \\\\ \n'

# Average duration for first, second, ... page
body += " \\vspace{.5cm} Average duration per page (see also Figure \\ref{fig:avgtimeperpage}): \\\\ \n"
body += r'''\begin{tabular}{lll}
        \textbf{Page} & \textbf{Duration} & \textbf{\# subjects}\\
        '''
tpp_averages = [] # store average time per page
for page_number in range(len(duration_order)): 
    body += str(page_number+1) + "&" +\
        seconds2timestr(sum(duration_order[page_number])/len(duration_order[page_number])) +\
            "&"+str(len(duration_order[page_number]))+r"\\"
    tpp_averages.append(sum(duration_order[page_number])/len(duration_order[page_number]))
            
body += '\\end{tabular} \\vspace{1.5cm} \\\\ \n'

# SHOW bar plot of average time per page
plt.bar(range(1,len(duration_order)+1), tpp_averages)
plt.xlabel('Page')
plt.xlim(.8, len(duration_order)+1)
plt.xticks(np.arange(1,len(duration_order)+1)+.4, range(1,len(duration_order)+1))
plt.ylabel('Time [seconds]')
plt.savefig(folder_name+"/time_per_page.pdf", bbox_inches='tight')
plt.close()
body += r'''\begin{figure}[htbp]
         \begin{center}
         \includegraphics[width=\textwidth]{'''+\
         folder_name+"/time_per_page.pdf"+\
        r'''}
        \caption{Average time spent per audioholder page.}
        \label{fig:avgtimeperpage}
         \end{center}
         \end{figure}
         '''
#TODO add error bars


# Sort pages by number of audioelements, then by duration

# average duration and number of subjects per page
average_duration_page = []
number_of_subjects_page = []
for line in duration_page:
    number_of_subjects_page.append(len(line))
    average_duration_page.append(sum(line)/len(line))

# combine and sort in function of number of audioelements and duration
combined_list = [page_names, average_duration_page, fragments_per_page, number_of_subjects_page]
combined_list = sorted(zip(*combined_list), key=operator.itemgetter(1, 2)) # sort

# Show average duration for all songs
body += r'''\vspace{.5cm} Average duration per audioholder: \\
        \begin{tabular}{llll}
        \textbf{Audioholder} & \textbf{Duration} & \textbf{\# subjects} & \textbf{\# fragments} \\
        '''
for page_index in range(len(page_names)):
    body +=  combined_list[page_index][0] + "&" +\
             seconds2timestr(combined_list[page_index][1]) + "&" +\
             str(combined_list[page_index][3]) + "&" +\
             str(combined_list[page_index][2]) + r"\\"
body += '\\end{tabular}\n'

#TODO
# time per page in function of number of fragments (plot)
# time per participant in function of number of pages
# plot total time for each participant
# plot total time
# show 'count' per page (in order)

# clear up page_index <> page_count <> page_number confusion


texfile = header+body+footer

# write TeX file
with open(folder_name + '/' + 'test.tex','w') as f:
    f.write(texfile)
proc=subprocess.Popen(shlex.split('pdflatex -output-directory='+folder_name+' '+ folder_name + '/test.tex'))
proc.communicate()
# run again
proc=subprocess.Popen(shlex.split('pdflatex -output-directory='+folder_name+' '+ folder_name + '/test.tex'))
proc.communicate()

#TODO remove auxiliary LaTeX files