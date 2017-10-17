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
assert len(sys.argv)<4, "generate_report takes at most 2 command line arguments\n"+\
                        "Use: python generate_report.py [results_folder] [no_render | -nr]"

render_figures = True

# XML results files location
if len(sys.argv) == 1:
    folder_name = "../saves/"    # Looks in 'saves/' folder from 'scripts/' folder
    print("Use: python generate_report.py [results_folder] [no_render | -nr]")
    print("Using default path: " + folder_name)
elif len(sys.argv) == 2:
    folder_name = sys.argv[1]   # First command line argument is folder
elif len(sys.argv) == 3:
    folder_name = sys.argv[1]   # First command line argument is folder
    assert sys.argv[2] in ('no_render','-nr'), "Second argument not recognised. \n" +\
           "Use: python generate_report.py [results_folder] [no_render | -nr]"
    # Second command line argument is [no_render | -nr]
    render_figures = False

def isNaN(num):
    return num != num

# Turn number of seconds (int) to '[minutes] min [seconds] s' (string)
def seconds2timestr(time_in_seconds):
    if time_in_seconds is not None and not isNaN(time_in_seconds): 
        time_in_minutes = int(time_in_seconds/60)
        remaining_seconds = int(time_in_seconds%60)
        return str(time_in_minutes) + " min " + str(remaining_seconds) + " s"
    else:
        return 'N/A'

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
real_page_names  = [] # regardless of differing numbers of fragments
subject_count    = [] # subjects per page name
page_count       = []
duration_page    = []      # duration of experiment in function of page content
duration_order   = []      # duration of experiment in function of page number
fragments_per_page = []    # number of fragments for corresponding page

# survey stats
gender = []
age    = []

# diagnostics
browser  = []
platform = []

# get username if available
for name in ('LOGNAME', 'USER', 'LNAME', 'USERNAME'):
    user = os.environ.get(name)
    if user:
        break
    else:
        user = ''

# Months
month_array = ['January', 'February', 'March', 'April', 'May', 'June', \
                'July', 'August', 'September', 'October', 'November', 'December']

# begin LaTeX document
header = r'''\documentclass[11pt, oneside]{article} 
          \usepackage{geometry}
          \geometry{a4paper}
          \usepackage[parfill]{parskip} % empty line instead of indent
          \usepackage{graphicx}         % figures
          \usepackage[space]{grffile}   % include figures with spaces in paths
          \usepackage[pdfpagelabels]{hyperref}
          \usepackage{tikz}             % pie charts
          \usepackage{float}            % place figures 'here'
          \title{Report}
          \author{'''+\
          user+\
          r'''}
          \graphicspath{{'''+\
          folder_name+\
          r'''}}
          %\setcounter{section}{-1} % Summary section 0 so number of sections equals number of files
          \begin{document}
          \maketitle
          This is an automatically generated report using the `generate\_report.py' Python script 
          included with the Web Audio Evaluation Tool \cite{WAET} distribution which can be found 
          at \texttt{\href{https://github.com/BrechtDeMan/WebAudioEvaluationTool}{github.com/BrechtDeMan/WebAudioEvaluationTool}}.
          \tableofcontents
          
          '''
          
footer = '\n\t\t'+r'''\begin{thebibliography}{1}
         \bibitem{WAET} % reference to accompanying publication
        Nicholas Jillings, Brecht De Man, David Moffat and Joshua D. Reiss, 
        ``Web Audio Evaluation Tool: A browser-based listening test environment,'' 
        presented at the 12th Sound and Music Computing Conference, July 2015.
        \end{thebibliography}
        \end{document}'''

# make sure folder_name ends in '/'
folder_name = os.path.join(folder_name, '')

# generate images for later use
if render_figures:
    script_path = os.path.dirname(os.path.realpath(__file__)) # where is generate_report.py?
    subprocess.call("python " +script_path+"/timeline_view_movement.py '"+folder_name+"'", shell=True)
    subprocess.call("python " +script_path+"/score_parser.py '"+folder_name+"'", shell=True)
    subprocess.call("python " +script_path+"/score_plot.py '"+folder_name+"ratings/'", shell=True)

# make array of text and array of dates
body_array = []
date_array = []

# get every XML file in folder
files_list = os.listdir(folder_name)
for file in files_list: # iterate over all files in files_list
    if file.endswith(".xml"): # check if XML file
        number_of_XML_files += 1
        tree = ET.parse(folder_name + file)
        root = tree.getroot()
        
        # get date
          # <datetime>
          #   <date year="2016" month="7" day="12"/>
          #   <time hour="14" minute="12" secs="6"/>
          # </datetime>
        date_node = root.find("./datetime/date")
        time_node = root.find("./datetime/time")
        year   = date_node.get("year")
        month  = date_node.get("month")
        day    = date_node.get("day")
        hour   = time_node.get("hour")
        minute = time_node.get("minute")
        second = time_node.get("secs")
        date_array.append((int(year),int(month),int(day),\
            int(hour),int(minute),int(second)))

        # prepend zero if needed
        minute_string = str(minute) if int(minute)>9 else "0"+str(minute)
        second_string = str(second) if int(second)>9 else "0"+str(second)
        
        # date as section title
        body = '\n\section{'+day+' '+month_array[int(month)-1]+' '+year+' '+hour+':'+\
                    minute_string+':'+second_string+'}\n'

        # file name
        body += '\t\tFile: '+file[:-4]+'\\\\ \n'

        # reset for new subject
        total_duration = 0
        page_number = 0
        
        individual_table = '\n' # table with stats for this individual test file
        timeline_plots = '' # plots of timeline (movements and plays)
        
        # diagnostics: browser
        vendor = root.find("./navigator/vendor")
        if vendor is not None and vendor.text is not None:
            browser.append(vendor.text.replace(',',''))
        else:
            browser.append('UNAVAILABLE')

        # diagnostics: platform
        platform_tag = root.find("./navigator/platform")
        if platform_tag is not None and platform_tag.text is not None:
            platform.append(platform_tag.text.replace('_','\_'))
        else:
            platform_tag.append('UNAVAILABLE')

        # DEMO survey stats
        # get gender
        post_survey = root.find("./survey/[@location='post']")
        this_subjects_gender = post_survey.find("./surveyresult/[@ref='gender']/response")
        if this_subjects_gender is not None:
            gender.append(this_subjects_gender.get("name"))
        else:
            gender.append('UNAVAILABLE')
        # get age
        this_subjects_age = post_survey.find("./surveyresult/[@ref='age']/response")
        if this_subjects_age is not None:
            age.append(this_subjects_age.text)
        if this_subjects_gender is not None:
            body += 'Details: '+this_subjects_gender.get("name")
            if this_subjects_age is not None:
                body += ', ' + this_subjects_age.text
            body += '\\\\ \n'
                
        # get list of all page names
        for page in root.findall("./page"):   # iterate over pages
            page_name = page.get('ref')               # get page name
            
            if page_name is None: # ignore 'empty' audio_holders
                print("WARNING: " + file + " contains empty audio holder. (evaluation_stats.py)")
                break # move on to next
            
            number_of_comments = 0 # for this page
            number_of_missing_comments = 0 # for this page
            not_played = [] # for this page
            not_moved = [] # for this page
            
            if page.find("./metric/metricresult[@id='testTime']") is not None: # check if time is included
                # 'testTime' keeps total duration: subtract time so far for duration of this page
                duration = float(page.find("./metric/metricresult[@id='testTime']").text)# - total_duration
            
                # total duration of test
                total_duration += duration
            else: 
                duration = float('nan')
                total_duration = float('nan')
            
            # number of audio elements
            audioelements = page.findall("./audioelement") # get audioelements
            number_of_fragments += len(audioelements) # add length of this list to total
            
            # number of comments (interesting if comments not mandatory)
            for audioelement in audioelements:
                if audioelement.get("type") != "outside-reference":
                    response = audioelement.find("./comment/response")
                    was_played = audioelement.find("./metric/metricresult/[@name='elementFlagListenedTo']")
                    was_moved = audioelement.find("./metric/metricresult/[@name='elementFlagMoved']")
                    if response is not None and response.text is not None and len(response.text) > 1: 
                        number_of_comments += 1
                    else: 
                        number_of_missing_comments += 1
                    if was_played is not None and was_played.text == 'false': 
                        not_played.append(audioelement.get('name'))
                    if was_moved is not None and was_moved.text == 'false': 
                        not_moved.append(audioelement.get('name'))
            
            # update global counters
            total_empty_comments += number_of_missing_comments
            total_not_played += len(not_played)
            total_not_moved += len(not_moved)
            
            # PRINT alerts when elements not played or markers not moved
            # number of audio elements not played
            if len(not_played) > 1:
                body += '\t\t\\emph{\\textbf{ATTENTION: '+str(len(not_played))+\
                        ' fragments were not listened to in '+page_name+'! }}'+\
                        ', '.join(not_played)+'\\\\ \n'
            if len(not_played) == 1: 
                body += '\t\t\\emph{\\textbf{ATTENTION: one fragment was not listened to in '+page_name+'! }}'+\
                        not_played[0]+'\\\\ \n'
            
            # number of audio element markers not moved
            if len(not_moved) > 1:
                body += '\t\t\\emph{\\textbf{ATTENTION: '+str(len(not_moved))+\
                        ' markers were not moved in '+page_name+'! }}'+\
                        ', '.join(not_moved)+'\\\\ \n'
            if len(not_moved) == 1: 
                body += '\t\t\\emph{\\textbf{ATTENTION: one marker was not moved in '+page_name+'! }}'+\
                        not_moved[0]+'\\\\ \n'
            
            # PRINT song-specific statistic
            individual_table += '\t\t'+page_name+'&'+\
                                str(number_of_comments) + '/' +\
                                str(number_of_comments+number_of_missing_comments)+'&'+\
                                seconds2timestr(duration)+'\\\\\n'
            
            # get timeline for this page
            img_path = 'timelines_movement/'+file[:-4]+'-'+page_name+'.pdf'
            
            # check if available
            if os.path.isfile(folder_name+img_path):
                # SHOW timeline image
                timeline_plots += '\\includegraphics[width=\\textwidth]{'+\
                         folder_name+img_path+'}\n\t\t'
            
            # keep track of duration in function of page index
            if len(duration_order)>page_number:
                duration_order[page_number].append(duration)
            else:
                duration_order.append([duration])
            
            # keep list of page ids and count how many times each page id
            # was tested, how long it took, and how many fragments there were 
            # (if number of fragments is different, store as different page id)
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
            
            # number of subjects per page regardless of differing numbers of 
            # fragments (for inclusion in box plots)
            if page_name in real_page_names:
                page_index = real_page_names.index(page_name) # get index
                subject_count[page_index] += 1
            else: 
                real_page_names.append(page_name)
                subject_count.append(1)
            
            # bookkeeping
            page_number += 1 # increase page count for this specific test
            number_of_pages += 1 # increase total number of pages
            time_per_page_accum += duration # total duration (for average time spent per page)

        # PRINT table with statistics about this test
        body += '\t\t'+r'''\begin{tabular}{|p{3.5cm}|c|p{2.5cm}|}
                 \hline
                 \textbf{Song name} & \textbf{Comments} & \textbf{Duration} \\ \hline '''+\
                 individual_table+'\t\t'+\
                 r'''\hline
                  \textbf{TOTAL} & & \textbf{'''+\
                  seconds2timestr(total_duration)+\
                 r'''}\\
                  \hline 
                  \end{tabular}
                  
                  '''
        # PRINT timeline plots
        body += timeline_plots+'\n'

        body_array.append(body)

# put sections in order according to date
body_array_ordered = [b for d,b in sorted(zip(date_array,body_array))]
body = ''.join(body_array_ordered)

# join to footer
footer = body + footer

# empty body again
body = ''

# PRINT summary of everything (at start) 
#       unnumbered so that number of sections equals number of files
body += '\section*{Summary}\n\t\t\\addcontentsline{toc}{section}{Summary}\n'

# PRINT table with statistics
body += '\t\t\\begin{tabular}{ll}\n\t\t\t'
body += r'Number of XML files: &' + str(number_of_XML_files) + r'\\'+'\n\t\t\t'
body += r'Number of pages: &' + str(number_of_pages) + r'\\'+'\n\t\t\t'
body += r'Number of fragments: &' + str(number_of_fragments) + r'\\'+'\n\t\t\t'
body += r'Number of empty comments: &' + str(total_empty_comments) +\
      " (" + str(round(100.0*total_empty_comments/number_of_fragments,2)) + r"\%)\\"+'\n\t\t\t'
body += r'Number of unplayed fragments: &' + str(total_not_played) +\
      " (" + str(round(100.0*total_not_played/number_of_fragments,2)) + r"\%)\\"+'\n\t\t\t'
body += r'Number of unmoved markers: &' + str(total_not_moved) +\
      " (" + str(round(100.0*total_not_moved/number_of_fragments,2)) + r"\%)\\"+'\n\t\t\t'
body += r'Average time per page: &' + seconds2timestr(time_per_page_accum/number_of_pages) + r"\\"+'\n\t\t'
body += '\\end{tabular} \\\\ \n'

# Average duration for first, second, ... page
body += "\n\n\t\t\\subsection*{Average duration per ordered page}\n See also Figure \\ref{fig:avgtimeperorder}. \\\\ \n\t\t"
body += r'''\begin{tabular}{lll}
                    \textbf{Page} & \textbf{Duration} & \textbf{\# subjects}\\'''
tpp_averages = [] # store average time per page
for page_number in range(len(duration_order)): 
    body += '\n\t\t\t'+str(page_number+1) + "&" +\
        seconds2timestr(sum(duration_order[page_number])/len(duration_order[page_number])) +\
            "&"+str(len(duration_order[page_number]))+r"\\"
    tpp_averages.append(sum(duration_order[page_number])/len(duration_order[page_number]))
            
body += '\n\t\t\\end{tabular} \\vspace{1.5cm} \\\\ \n\n\t\t'

# SHOW bar plot of average time per page
plt.bar(range(1,len(duration_order)+1), np.array(tpp_averages)/60)
plt.xlabel('Page order')
plt.xlim(.8, len(duration_order)+1)
plt.xticks(np.arange(1,len(duration_order)+1)+.4, range(1,len(duration_order)+1))
plt.ylabel('Average time [minutes]')
plt.savefig(folder_name+"time_per_order.pdf", bbox_inches='tight')
plt.close()
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
body += '\n\n\t\t'+r'''\subsection*{Average duration per page}
                See also Figure \ref{fig:avgtimeperpage}. \\ 
                \begin{tabular}{llll}
                        \textbf{Audioholder} & \textbf{Duration} & \textbf{\# subjects} & \textbf{\# fragments} \\'''
page_names_ordered = []
average_duration_page_ordered = []
number_of_subjects = []
for page_index in range(len(page_names)):
    page_names_ordered.append(combined_list[page_index][0])
    average_duration_page_ordered.append(combined_list[page_index][1])
    number_of_subjects.append(combined_list[page_index][3])
    body +=  '\n\t\t\t'+combined_list[page_index][0] + "&" +\
             seconds2timestr(combined_list[page_index][1]) + "&" +\
             str(combined_list[page_index][3]) + "&" +\
             str(combined_list[page_index][2]) + r"\\"
body += '\n\t\t\\end{tabular}\n'

# SHOW bar plot of average time per page
plt.bar(range(1,len(page_names_ordered)+1), np.array(average_duration_page_ordered)/60)
plt.xlabel('Audioholder')
plt.xlim(.8, len(page_names_ordered)+1)
plt.xticks(np.arange(1,len(page_names_ordered)+1)+.4, page_names_ordered, rotation=90)
plt.ylabel('Average time [minutes]')
plt.savefig(folder_name+"time_per_page.pdf", bbox_inches='tight')
plt.close()

# SHOW bar plot of average time per page
plt.bar(range(1,len(page_names_ordered)+1), number_of_subjects)
plt.xlabel('Audioholder')
plt.xlim(.8, len(page_names_ordered)+1)
plt.xticks(np.arange(1,len(page_names_ordered)+1)+.4, page_names_ordered, rotation=90)
plt.ylabel('Number of subjects')
ax = plt.gca()
ylims = ax.get_ylim()
yint = np.arange(int(np.floor(ylims[0])), int(np.ceil(ylims[1]))+1)
plt.yticks(yint)
plt.savefig(folder_name+"subjects_per_page.pdf", bbox_inches='tight')
plt.close()

# SHOW these figures
body += r'''
        \begin{figure}[htbp]
        \begin{center}
        \includegraphics[width=.65\textwidth]{'''+\
         folder_name+'time_per_order.pdf'+\
        r'''}
        \caption{Average time spent per page (order).}
        \label{fig:avgtimeperorder}
        \end{center}
        \end{figure}
         
         '''
body += r'''\begin{figure}[htbp]
        \begin{center}
        \includegraphics[width=.65\textwidth]{'''+\
         folder_name+'time_per_page.pdf'+\
        r'''}
        \caption{Average time spent per page (content).}
        \label{fig:avgtimeperpage}
        \end{center}
        \end{figure}
         
         '''
body += r'''\begin{figure}[htbp]
        \begin{center}
        \includegraphics[width=.65\textwidth]{'''+\
         folder_name+'subjects_per_page.pdf'+\
        r'''}
        \caption{Number of subjects per page.}
        \label{fig:subjectsperpage}
        \end{center}
        \end{figure}

         '''
#TODO add error bars
#TODO layout of figures

# SHOW boxplot per page (in alphabetical order of page name)
#TODO get scale names (now hardcoded 'preference' automatically)
body += '\t\t\\clearpage \n\t\\subsection*{Ratings per page}\n'
for page_name in sorted(page_names): # get each name
    # plot boxplot if exists (not so for the 'alt' names)
    if os.path.isfile(folder_name+'ratings/'+page_name+'-preference-ratings-box.pdf'):
        body += r'''\begin{figure}[H]
        \begin{center}
        \includegraphics[width=.65\textwidth]{'''+\
         folder_name+"ratings/"+page_name+'-preference-ratings-box.pdf'+\
        r'''}
        \caption{Box plot of ratings for page '''+\
        page_name+' ('+str(subject_count[real_page_names.index(page_name)])+\
        ''' participants).}
        \label{fig:boxplot'''+page_name.replace(" ", "")+'''}
        \end{center}
        \end{figure}
        
             '''

# DEMO pie chart of gender distribution among subjects
genders = ['male', 'female', 'other', 'preferNotToSay', 'UNAVAILABLE']
# TODO: get the above automatically
gender_distribution = ''
for item in genders:
    number = gender.count(item)
    if number>0:
        gender_distribution += str("{:.2f}".format((100.0*number)/len(gender)))+\
                               '/'+item.capitalize()+' ('+str(number)+'),\n'

body += r'''
        % Pie chart of gender distribution
        \def\angle{0}
        \def\radius{3}
        \def\cyclelist{{"orange","blue","red","green"}}
        \newcount\cyclecount \cyclecount=-1
        \newcount\ind \ind=-1
        \begin{figure}[htbp]
        \begin{center}\begin{tikzpicture}[nodes = {font=\sffamily}]
        \foreach \percent/\name in {'''+\
        gender_distribution+\
        r'''} {\ifx\percent\empty\else               % If \percent is empty, do nothing
        \global\advance\cyclecount by 1     % Advance cyclecount
        \global\advance\ind by 1            % Advance list index
        \ifnum6<\cyclecount                 % If cyclecount is larger than list
          \global\cyclecount=0              %   reset cyclecount and
          \global\ind=0                     %   reset list index
        \fi
        \pgfmathparse{\cyclelist[\the\ind]} % Get color from cycle list
        \edef\color{\pgfmathresult}         %   and store as \color
        % Draw angle and set labels
        \draw[fill={\color!50},draw={\color}] (0,0) -- (\angle:\radius)
          arc (\angle:\angle+\percent*3.6:\radius) -- cycle;
        \node at (\angle+0.5*\percent*3.6:0.7*\radius) {\percent\,\%};
        \node[pin=\angle+0.5*\percent*3.6:\name]
          at (\angle+0.5*\percent*3.6:\radius) {};
        \pgfmathparse{\angle+\percent*3.6}  % Advance angle
        \xdef\angle{\pgfmathresult}         %   and store in \angle
        \fi
        };
        \end{tikzpicture}
        \caption{Representation of gender across subjects}
        \label{default}
        \end{center}
        \end{figure}
        
        '''
# problem: some people entered twice? 


# pie chart of browser usage
browsers = ['Google Inc.', 'Apple Computer Inc.', 'UNAVAILABLE']
# TODO: get the above automatically
browser_distribution = ''
for item in browsers:
    number = browser.count(item)
    if number>0:
        browser_distribution += str("{:.2f}".format((100.0*number)/len(browser)))+\
                               '/'+item.capitalize()+' ('+str(number)+'),\n'

body += r'''
        % Pie chart of browser distribution
        \def\angle{0}
        \def\radius{3}
        \def\cyclelist{{"orange","blue","red","green"}}
        \newcount\cyclecount \cyclecount=-1
        \newcount\ind \ind=-1
        \begin{figure}[htbp]
        \begin{center}\begin{tikzpicture}[nodes = {font=\sffamily}]
        \foreach \percent/\name in {'''+\
        browser_distribution+\
        r'''} {\ifx\percent\empty\else               % If \percent is empty, do nothing
        \global\advance\cyclecount by 1     % Advance cyclecount
        \global\advance\ind by 1            % Advance list index
        \ifnum6<\cyclecount                 % If cyclecount is larger than list
          \global\cyclecount=0              %   reset cyclecount and
          \global\ind=0                     %   reset list index
        \fi
        \pgfmathparse{\cyclelist[\the\ind]} % Get color from cycle list
        \edef\color{\pgfmathresult}         %   and store as \color
        % Draw angle and set labels
        \draw[fill={\color!50},draw={\color}] (0,0) -- (\angle:\radius)
          arc (\angle:\angle+\percent*3.6:\radius) -- cycle;
        \node at (\angle+0.5*\percent*3.6:0.7*\radius) {\percent\,\%};
        \node[pin=\angle+0.5*\percent*3.6:\name]
          at (\angle+0.5*\percent*3.6:\radius) {};
        \pgfmathparse{\angle+\percent*3.6}  % Advance angle
        \xdef\angle{\pgfmathresult}         %   and store in \angle
        \fi
        };
        \end{tikzpicture}
        \caption{Representation of browsers across subjects}
        \label{default}
        \end{center}
        \end{figure}
        
        '''

# pie chart of platform usage
platforms = ['Win32', 'Win64', 'MacIntel', 'Linux i686', 'Linux x86\_64', 'UNAVAILABLE']
# TODO: get the above automatically # order alphabetically
platform_distribution = ''
for item in platforms:
    number = platform.count(item)
    if number>0:
        platform_distribution += str("{:.2f}".format((100.0*number)/len(platform)))+\
                               '/'+item.capitalize()+' ('+str(number)+'),\n'

body += r'''
        % Pie chart of browser distribution
        \def\angle{0}
        \def\radius{3}
        \def\cyclelist{{"orange","blue","red","green","cyan"}}
        \newcount\cyclecount \cyclecount=-1
        \newcount\ind \ind=-1
        \begin{figure}[htbp]
        \begin{center}\begin{tikzpicture}[nodes = {font=\sffamily}]
        \foreach \percent/\name in {'''+\
        platform_distribution+\
        r'''} {\ifx\percent\empty\else               % If \percent is empty, do nothing
        \global\advance\cyclecount by 1     % Advance cyclecount
        \global\advance\ind by 1            % Advance list index
        \ifnum6<\cyclecount                 % If cyclecount is larger than list
          \global\cyclecount=0              %   reset cyclecount and
          \global\ind=0                     %   reset list index
        \fi
        \pgfmathparse{\cyclelist[\the\ind]} % Get color from cycle list
        \edef\color{\pgfmathresult}         %   and store as \color
        % Draw angle and set labels
        \draw[fill={\color!50},draw={\color}] (0,0) -- (\angle:\radius)
          arc (\angle:\angle+\percent*3.6:\radius) -- cycle;
        \node at (\angle+0.5*\percent*3.6:0.7*\radius) {\percent\,\%};
        \node[pin=\angle+0.5*\percent*3.6:\name]
          at (\angle+0.5*\percent*3.6:\radius) {};
        \pgfmathparse{\angle+\percent*3.6}  % Advance angle
        \xdef\angle{\pgfmathresult}         %   and store in \angle
        \fi
        };
        \end{tikzpicture}
        \caption{Representation of platforms across subjects}
        \label{default}
        \end{center}
        \end{figure}
        
        '''


#TODO
# time per page in function of number of fragments (plot)
# time per participant in function of number of pages
# plot total time for each participant
# show 'count' per page (in order)

# clear up page_index <> page_count <> page_number confusion


texfile = header+body+footer # add bits together

# print('pdflatex -output-directory="'+folder_name+'"" "'+ folder_name + 'Report.tex"')# DEBUG

# write TeX file
with open(folder_name + 'Report.tex','w') as f:
    f.write(texfile)
proc=subprocess.Popen(shlex.split('pdflatex -output-directory="'+folder_name+'" "'+ folder_name + 'Report.tex"'))
proc.communicate()
# run again
proc=subprocess.Popen(shlex.split('pdflatex -output-directory="'+folder_name+'" "'+ folder_name + 'Report.tex"'))
proc.communicate()

#TODO remove auxiliary LaTeX files
try:
    os.remove(folder_name + 'Report.aux')
    os.remove(folder_name + 'Report.log')
    os.remove(folder_name + 'Report.out')
    os.remove(folder_name + 'Report.toc')
except OSError:
    pass
    
