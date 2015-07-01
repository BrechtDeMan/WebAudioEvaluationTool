WEB AUDIO EVALUATION TOOL

This is not (yet) a fully fledged manual. 


AUTHORS
Nicholas Jillings 		<n.g.r.jillings@se14.qmul.ac.uk>
Brecht De Man			<b.deman@qmul.ac.uk>
David Moffat			<d.j.moffat@qmul.ac.uk>
Joshua D. Reiss (supervisor)	<j.d.reiss@qmul.ac.uk>


PACKAGE CONTENTS

- main folder (/)
	- ape.css, core.css, graphics.css, structure.css: style files (edit to change appearance)
	- ape.js: JavaScript file for APE-style interface [1]
	- core.js: JavaScript file with core functionality
	- index.html: webpage where interface should appear
	- jquery-2.1.4.js: jQuery JavaScript Library
	- pythonServer.py: webserver for running tests locally
	- pythonServer-legacy.py: webserver with limited functionality (no storing of output XML files)
- Documentation (/docs/)
	- Project Specification Document (LaTeX/PDF)
	- Results Specification Document (LaTeX/PDF)
	- SMC15: PDF and LaTeX source of corresponding SMC2015 publication
- Example project (/example_eval/)
	An example of what the set up XML should look like, with example audio files 0.wav-10.wav which are short recordings at 44.1kHz, 16bit of a woman saying the corresponding number (useful for testing randomisation and general familiarisation with the interface). 
- Output files (/saves/)
	The output XML files of tests will be stored here by default by the pythonServer.py script. 
- Auxiliary scripts (/scripts/)
	Helpful Python scripts for extraction and visualisation of data. 
- Test creation tool (/test_create/)
	Webpage for easily setting up a test without having to delve into the XML. 


QUICK START
Using the example project: 
1. Make sure your system sample rate corresponds with the sample rate of the audio files, if the input XML file enforces the given sample rate. 
2. Run pythonServer.py (make sure you have Python installed). 
3. Open a browser (anything but Internet Explorer). 
4. Go to ‘localhost:8000’. 
5. The test should open; complete it and look at the output XML file in /saves/. 


LEGACY
The APE interface and most of the functionality of the interface is inspired by the APE toolbox for MATLAB [1]. See https://code.soundsoftware.ac.uk/projects/ape for the source code and corresponding paper. 


CITING

We request that you acknowledge the authors and cite our work [2], see CITING.txt. 


LICENSE

See LICENSE.txt. This code is shared under the GNU General Public License v3.0 (http://choosealicense.com/licenses/gpl-3.0/). Generally speaking, this is a copyleft license that requires anyone who distributes our code or a derivative work to make the source available under the same terms. 


FEATURE REQUESTS AND BUG REPORTS

We continually develop this tool to fix issues and implement features useful to us or our user base. See https://code.soundsoftware.ac.uk/projects/webaudioevaluationtool/issues for a list of feature requests and bug reports, and their status. 

Please contact the authors if you experience any bugs, if you would like additional functionality, if you have questions about using the interface or if you would like to give any feedback (even positive!) about the interface. We look forward to learning how the tool has (not) been useful to you. 


TROUBLESHOOTING

Thanks to feedback from using the interface in experiments by the authors and others, many bugs have been caught and fatal crashes due to the interface (provided it is set up properly by the user) seem to be a thing of the past. 
However, if things do go wrong or the test needs to be interrupted for whatever reason, all data is not lost. In a normal scenario, the test needs to be completed until the end (the final ‘Submit’), at which point the output XML is stored in ‘saves/‘. If this stage is not reached, a lot of data can be read from the JavaScript Console (see below for how to find it). Specifically:
	- the randomisation of pages and fragments are logged;
	- any time a slider is played, its ID and the time stamp (in seconds since the start of the test) are displayed;
	- any time a slider is dragged and dropped, the location where it is dropped including the time stamp are shown; 
	- any comments and pre- or post-test questions and their answers are logged as well. 

You can select all this and save into a text file, so that none of this data is lost. 

In Google Chrome, the JavaScript Console can be found in View>Developer>JavaScript Console, or via the keyboard shortcut Cmd + Alt + J (Mac OS X). 
In Safari, the JavaScript Console can be found in Develop>Show Error Console, or via the keyboard shortcut Cmd + Alt + C (Mac OS X). Note that for the Developer menu to be visible, you have to go to Preferences (Cmd + ,) and enable ‘Show Develop menu in menu bar’ in the ‘Advanced’ tab. 
In Firefox, go to Tools>Web Developer>Web Console, or hit Cmd + Alt + K. 


SCRIPTS

The tool comes with a few handy Python scripts for easy extraction of ratings or comments, and visualisation of ratings and timelines. See below for a quick guide on how to use them. All scripts written for Python 2.7. Visualisation requires the free matplotlib toolbox (http://matplotlib.org), numpy and scipy. 
By default, the scripts can be run from the ‘scripts’ folder, with the result files in the ‘saves’ folder (the default location where result XMLs are stored). 

	comment_parser.py
		Extracts comments from the output XML files corresponding with the different subjects found in ‘saves/’. It creates a folder per ‘audioholder’/page it finds, and stores a CSV file with comments for every ‘audioelement’/fragment within these respective ‘audioholders’/pages. In this CSV file, every line corresponds with a subject/output XML file. Depending on the settings, the first column containing the name of the corresponding XML file can be omitted (for anonymisation). 
		Beware of Excel: sometimes the UTF-8 is not properly imported, leading to problems with special characters in the comments (particularly cumbersome for foreign languages). 

	evaluation_stats.py
		Shows a few statistics of tests in the ‘saves/‘ folder so far, mainly for checking for errors. Shows the number of files that are there, the audioholder IDs that were tested (and how many of each separate ID), the duration of each page, the duration of each complete test, the average duration per page, and the average duration in function of the page number. 

	score_parser.py
		Extracts rating values from the XML to CSV - necessary for running visualisation of ratings. Creates the folder ‘saves/ratings/‘ if not yet created, to which it writes a separate file for every ‘audioholder’/page in any of the output XMLs it finds in ‘saves/‘. Within each file, rows represent different subjects (output XML file names) and columns represent different ‘audioelements’/fragments. 

	score_plot.py
		Plots the ratings as stored in the CSVs created by score_parser.py
		Depending on the settings, it displays and/or saves (in ‘saves/ratings/’) a boxplot, confidence interval plot, scatter plot, or a combination of the aforementioned. 
		Requires the free matplotlib library. 
		At this point, more than one subjects are needed for this script to work. 

	timeline_view.py
		Creates a timeline for every subject, for every ‘audioholder’/page, corresponding with any of the output XML files found in ‘/saves’. It shows when and for how long the subject listened to each of the fragments. 



REFERENCES
[1] B. De Man and Joshua D. Reiss, “APE: Audio Perceptual Evaluation toolbox for MATLAB,” 136th Convention of the Audio Engineering Society, 2014.

[2] Nicholas Jillings, Brecht De Man, David Moffat and Joshua D. Reiss, "Web Audio Evaluation Tool: A Browser-Based Listening Test Environment," 12th Sound and Music Computing Conference, July 2015.
