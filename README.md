#bloom-cli

A command line utility to create a multipage static website from a [Ulysses](http://ulyssesapp.com) HTML export

![](http://i.imgur.com/fIQN10x.png)

##Usage

`npm install bloom-cli -g`

When you're exporting HTML from Ulysses, choose "Full Page" format.

Navigate to the folder you saved your HTML file in and type `bloom index.html`. Answer the questions and an index page will pop up with your linked files.

###Styles

Take advantage of Ullysses' styles marketplace. Any of the downloaded HTML styles from [http://styles.ulyssesapp.com/](http://styles.ulyssesapp.com/tagged/HTML) will still be there after you bloom, provided you chose the style when exporting HTML and used the Full Page option.

###Cover images

If you have a folder called `images` in the same location as your export location (you should make one maybe) and then inside that a file called `cover.jpg` the image will show up on your index page after you bloom.

###Exclude some sheets

In Ulysses, just add the `%` symbol in the title of any of your sheets. These files will be created but excluded from the index file, so they won't show on the list. I chose a `%` symbol because it means "unfinished" to me. If you're 99% done with something you're still not done with it.

###Show words? Or nah

One of the questions the program will ask you is if you'd like to show words next to the links on the index page. Say yeah if yean and nah if nah


##Now what?

I don't know, do it again when you want to update it?

Oh, right. The website part.

Open up FileZilla (or whatever FTP program people are using these days) and make a folder on your server to copy the files from `indexed-bloomed` into. Then navigate there in your browser. Voila: a website made from your Ulysses stack.
