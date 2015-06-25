import sys
import os
import csv
import matplotlib.pyplot as plt

rating_folder = 'ratings/' # folder with rating csv files

colormap = ['b', 'r', 'g', 'c', 'm', 'y', 'k'] # colormap for to cycle through
markerlist = ["x", ".", "o", "*", "+", "v", ">", "<", "8", "s", "p"]

show_legend = False

# get every csv file in folder
for file in os.listdir(rating_folder):
    if file.endswith(".csv"):
        
        page_name = file[:-4] # file name (without extension) is page ID

        with open(rating_folder+file, 'r') as readfile: # read this csv file
            filereader = csv.reader(readfile, delimiter=',')
            headerrow = filereader.next() # use headerrow as X-axis
            headerrow = headerrow[1:]


            increment = 0
            linehandles = []
            legendnames = []
            for row in filereader:
                subject_id = row[0][:-4]
                plothandle, = plt.plot(range(1,len(row)), # x-values
                         row[1:], # y-values: csv values except subject name
                         color=colormap[increment%len(colormap)],
                         marker=markerlist[increment%len(markerlist)],
                         markersize=10,
                         linestyle='None',
                         label=subject_id
                        )
                increment += 1 # increase counter
                linehandles.append(plothandle)
                legendnames.append(subject_id.decode("utf-8")) # avoid decoding problems


            plt.xlabel('Fragment')
            plt.title('Individual ratings '+page_name)
            plt.xlim(0, len(headerrow)+1) # only show relevant region, leave space left & right)
            plt.xticks(range(1, len(headerrow)+1), headerrow) # show fragment names

            plt.ylabel('Rating')
            plt.ylim(0,1)

            if show_legend:
                plt.legend(linehandles, legendnames,
                           loc='upper right',
                           bbox_to_anchor=(1.1, 1),
                           borderaxespad=0.,
                           numpoints=1 # remove extra marker
                           )

            #TODO Put legend outside of box

            #plt.show() # show plot
            #exit()
            
            plt.savefig(rating_folder+page_name+"-ind.png")
            plt.close()
