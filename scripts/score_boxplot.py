import sys
import os
import csv
import matplotlib.pyplot as plt
import numpy as np

# Enter folder where rating CSV files are (generated with score_parser.py or same format).
# Add subject names of individual ratings to be marked in 'show_individual'. 

rating_folder = 'ratings/' # folder with rating csv files
show_individual = [] # add name/list of names of individuals to plot

# get every csv file in folder
for file in os.listdir(rating_folder): # You have to put this in folder where rating csv files are.
    if file.endswith(".csv"):
        page_name = file[:-4] # file name (without extension) is page ID

        # get header
        with open(rating_folder+file, 'r') as readfile: # read this csv file
            filereader = csv.reader(readfile, delimiter=',')
            headerrow = filereader.next() # use headerrow as X-axis
            headerrow = headerrow[1:]

        # read ratings into matrix
        ratings = np.loadtxt(open(rating_folder+file,"rb"),
                            delimiter=",",
                            skiprows=1,
                            usecols=range(1,len(headerrow)+1)
                            )

        # draw boxplot
        plt.boxplot(ratings)
		
		if not show_individual:
			# add rating of individual(s)
			with open(rating_folder+file, 'r') as readfile: # read this csv file
				filereader = csv.reader(readfile, delimiter=',')
				headerrow = filereader.next() # use headerrow as X-axis
				headerrow = headerrow[1:]
				markerlist = ["x", ".", "o", "*", "+", "v", ">", "<", "8", "s", "p"]
				increment = 0
				linehandles = []
				legendnames = []
				for row in filereader:
					subject_id = row[0][:-4]
					if subject_id in show_individual:
						plothandle, = plt.plot(range(1,len(row)), # x-values
								 row[1:], # y-values: csv values except subject name
								 color='k',
								 marker=markerlist[increment%len(markerlist)],
								 markersize=10,
								 linestyle='None',
								 label=subject_id
								)
						increment += 1 # increase counter
						linehandles.append(plothandle)
						legendnames.append(subject_id)
						plt.legend(linehandles, legendnames,
							   loc='upper right',
							   bbox_to_anchor=(1.1, 1), borderaxespad=0.)


        plt.xlabel('Fragment')
        plt.title('Box plot '+page_name)
        plt.xlim(0, len(headerrow)+1) # only show relevant region, leave space left & right)
        plt.xticks(range(1, len(headerrow)+1), headerrow) # show fragment names

        plt.ylabel('Rating')
        plt.ylim(0,1)

        #plt.show() # show plot
        #exit()

        plt.savefig(rating_folder+page_name+"-box.png")
        plt.close()
