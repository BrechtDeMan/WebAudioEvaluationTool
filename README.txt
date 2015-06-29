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


REFERENCES
[1] B. De Man and Joshua D. Reiss, “APE: Audio Perceptual Evaluation toolbox for MATLAB,” 136th Convention of the Audio Engineering Society, 2014.

[2] Nicholas Jillings, Brecht De Man, David Moffat and Joshua D. Reiss, "Web Audio Evaluation Tool: A Browser-Based Listening Test Environment," 12th Sound and Music Computing Conference, July 2015.