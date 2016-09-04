#bloom-cli

A command line utility to create a multipage static website from a [Ulysses](http://ulyssesapp.com) HTML export

![](http://i.imgur.com/fIQN10x.png)

##Usage

Open a terminal and type `npm install bloom-cli -g` to install `bloom-cli` globally, letting you `bloom` from wherever you are.

When you're exporting HTML from Ulysses, choose "Full Page" format. Save it somewhere you can navigate to in the terminal / command prompt.

Navigate (via terminal / prompt) to the folder you saved your HTML file in and type `bloom index.html`. Answer the questions (like "What is the title of this thing", etc.) and an index page will pop up in a browser with your linked files all ready for you to click.

###Styles

Take advantage of Ulysses' styles marketplace. Any of the downloaded HTML styles from [http://styles.ulyssesapp.com/](http://styles.ulyssesapp.com/tagged/HTML) will be integrated into your bloomed project, provided you chose a style when exporting HTML and used the Full Page option.

###Cover images

If you have a folder called `images` in the same location as your export location (make one) and then inside that a file called `cover.jpg` the image will be sucked into your project and show up on your index page after you bloom. Va va voom.

###Exclude some sheets

In Ulysses, just add the `%` symbol in the title of any of your sheets. These files will be created but excluded from the index file, so they won't show on the list. I chose a `%` symbol because it means "unfinished" to me.

###Show words? Or nah

One of the questions the program will ask you is if you'd like to show words next to the links on the index page. Say y if yeah, default is nah.

###FTP Upload included

Now bloom-cli will ask you if you want your project uploaded, and will ask you for FTP credentials.

###I don't want to upload through the CLI

Open up FileZilla (or whatever FTP program people are using these days) and make a folder on your server to copy the files from `index-bloomed` into. Then navigate there in your browser. Voila: a website made from your Ulysses stack.
