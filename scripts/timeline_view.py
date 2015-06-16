import xml.etree.ElementTree as ET
import os
import matplotlib.pyplot as plt

colormap = ['b', 'r', 'g', 'c', 'm', 'y', 'k'] # colormap for to cycle through

timeline_folder = 'timelines/' # folder where to store timelines, e.g. 'timelines/'


# create timeline_folder if not yet created
if not os.path.exists(timeline_folder):
    os.makedirs(timeline_folder)

# get every XML file in folder
for file in os.listdir("."): # You have to put this script in folder where output XML files are.
    if file.endswith(".xml"):
        tree = ET.parse(file)
        root = tree.getroot()
        subject_id = file[:-4] # drop '.xml'
        
        # ONE TIMELINE PER PAGE - make new plot per page

        # get list of all page names
        for audioholder in root.findall("./audioholder"):   # iterate over pages
            page_name = audioholder.get('id')               # get page name
            
            if page_name is None: # ignore 'empty' audio_holders
                break

            # SORT AUDIO ELEMENTS ALPHABETICALLY
            audioelements = root.findall("*/[@id='"+page_name+"']/audioelement")
            
            data = []
            for elem in audioelements: # from http://effbot.org/zone/element-sort.htm
                key = elem.get("id")
                data.append((key, elem))
            data.sort()
            
            N_audioelements = len(audioelements) # number of audio elements for this page
            increment = 0 # increased for every new audioelement
            audioelements_names = [] # store names of audioelements
            
            # for page [page_name], print comments related to fragment [id]
            for tuple in data:
            	audioelement = tuple[1]
                if audioelement is not None: # Check it exists
                    audio_id = str(audioelement.get('id'))
                    audioelements_names.append(audio_id)
                    
                    # for this audioelement, loop over all listen events
                    listen_events = root.findall("*/[@id='"
                                           + page_name
                                           + "']/audioelement/[@id='"
                                           + audio_id
                                           + "']/metric/metricresult/[@name='elementListenTracker']/event")
                    for event in listen_events:
                        # get testtime: start and stop
                        start_time = event.find('testtime').get('start')
                        stop_time  = event.find('testtime').get('stop')
                        # event lines:
                        plt.plot([start_time, start_time], # x-values
                            [0, N_audioelements+1], # y-values
                            color='k'
                            )
                        plt.plot([stop_time, stop_time], # x-values
                            [0, N_audioelements+1], # y-values
                            color='k'
                            )
                        # plot time: 
                        plt.plot([start_time, stop_time], # x-values
                            [N_audioelements-increment, N_audioelements-increment], # y-values
                            color=colormap[increment%len(colormap)],
                            linewidth=6
                            )
                        
                increment+=1
                                           
            #TODO: if 'nonsensical' or unknown: dashed line until next event
            #TODO: Vertical lines for fragment looping point
            
            plt.title('Timeline ' + file) #TODO add song too
            plt.xlabel('Time [seconds]')
            plt.ylabel('Fragment')
            plt.ylim(0, N_audioelements+1)
            
            #y-ticks: fragment IDs, top to bottom
            plt.yticks(range(N_audioelements, 0, -1), audioelements_names) # show fragment names


            #plt.show() # uncomment to show plot; comment when just saving
            #exit()
            
            plt.savefig(timeline_folder+subject_id+"-"+page_name+".png")
            plt.close()