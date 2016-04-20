#!/usr/bin/python

import xml.etree.ElementTree as ET
import os # list files in directory
import sys # command line arguments
import matplotlib.pyplot as plt # plots
import matplotlib.patches as patches # rectangles

# COMMAND LINE ARGUMENTS

assert len(sys.argv)<3, "timeline_view takes at most 1 command line argument\n"+\
                        "Use: python timeline_view.py [XML_files_location]"

# XML results files location
if len(sys.argv) == 1:
    folder_name = "../saves"    # Looks in 'saves/' folder from 'scripts/' folder
    print("Use: python timeline_view.py [XML_files_location]")
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


# CONFIGURATION 

# Folder where to store timelines
timeline_folder = folder_name + '/timelines/'    # Stores in 'saves/timelines/'

# Font settings
font = {'weight' : 'bold',
        'size'   : 16}
plt.rc('font', **font)

# Colormap for to cycle through
colormap = ['b', 'r', 'g', 'c', 'm', 'y', 'k']

# bar height (<1 to avoid overlapping)
bar_height = 0.6

# figure size
fig_width = 25
fig_height = 5


# CODE

# create timeline_folder if not yet created
if not os.path.exists(timeline_folder):
    os.makedirs(timeline_folder)

# get every XML file in folder
for file in os.listdir(folder_name):
    if file.endswith(".xml"):
        tree = ET.parse(folder_name + '/' + file)
        root = tree.getroot()
        subject_id = file[:-4] # drop '.xml'
        
        # ONE TIMELINE PER PAGE - make new plot per page

        # get list of all page names
        for audioholder in root.findall("./page"):   # iterate over pages
            page_name = audioholder.get('ref')               # get page name
            plot_empty = True                               # check if any data is plotted
            
            if page_name is None: # ignore 'empty' audio_holders
                print("WARNING: " + file + " contains empty page. (comment_parser.py)")
                break
                
            if audioholder.get("state") != "complete":
                print("WARNING: " + file + "test page " + page_name + " is not complete, skipping.")
                break;
            # SORT AUDIO ELEMENTS ALPHABETICALLY
            audioelements = audioholder.findall("./audioelement")
            
            data = []
            for elem in audioelements: # from http://effbot.org/zone/element-sort.htm
                key = elem.get("ref")
                data.append((key, elem))
            data.sort()
            
            N_audioelements = len(audioelements) # number of audio elements for this page
            increment = 0 # increased for every new audioelement
            audioelements_names = [] # store names of audioelements
            
            # get axes handle
            fig = plt.figure(figsize=(fig_width, fig_height))
            ax  = fig.add_subplot(111) #, aspect='equal'
            
            # for page [page_name], print comments related to fragment [id]
            for tuple in data:
                audioelement = tuple[1]
                if audioelement is not None: # Check it exists
                    audio_id = str(audioelement.get('ref'))
                    audioelements_names.append(audio_id)
                    
                    # for this audioelement, loop over all listen events
                    listen_events = audioelement.findall("./metric/metricresult/[@name='elementListenTracker']/event")
                    for event in listen_events:
                        # mark this plot as not empty
                        plot_empty = False
                    
                        # get testtime: start and stop
                        start_time = float(event.find('testtime').get('start'))
                        stop_time  = float(event.find('testtime').get('stop'))
                        # event lines:
                        ax.plot([start_time, start_time], # x-values
                            [0, N_audioelements+1], # y-values
                            color='k'
                            )
                        ax.plot([stop_time, stop_time], # x-values
                            [0, N_audioelements+1], # y-values
                            color='k'
                            )
                        # plot time: 
                        ax.add_patch(
                            patches.Rectangle(
                                (start_time, N_audioelements-increment-bar_height/2), # (x, y)
                                stop_time - start_time, # width
                                bar_height, # height
                                color=colormap[increment%len(colormap)] # colour
                            )
                        )
                        
                increment+=1 # to next audioelement
            
            if not plot_empty:
                # set plot parameters
                plt.title('Timeline ' + file + ": "+page_name)
                plt.xlabel('Time [seconds]')
                plt.ylabel('Fragment')
                plt.ylim(0, N_audioelements+1)
            
                #y-ticks: fragment IDs, top to bottom
                plt.yticks(range(N_audioelements, 0, -1), audioelements_names) # show fragment names

                #plt.show() # uncomment to show plot; comment when just saving
                #exit()
            
                plt.savefig(timeline_folder+subject_id+"-"+page_name+".pdf", bbox_inches='tight')
                plt.close()
            
            #TODO: if 'nonsensical' or unknown: dashed line until next event
            #TODO: Vertical lines for fragment looping point
            