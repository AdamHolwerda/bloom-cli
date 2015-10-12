#bloom-cli

A command line utility to create a multipage static website from a Ulysses export

`npm install bloom-cli -g`

When you're exporting HTML from Ulysses, choose "Full Page" format.

Navigate to the folder you saved your HTML file in and type `bloom index.html`. Answer the questions and an index page will pop up with your linked files.

###Cover images

If you have a folder called `images` in the same location as your export location (you should make one maybe) and then inside that a file called `cover.jpg` the image will show up on your index page after you bloom.

###Exclude some sheets

In Ulysses, just add the `%` symbol in the title of any of your sheets. These files will be created but excluded from the index file, so they won't show on the list. I chose a `%` symbol because it means "unfinished" to me. If you're 99% done with something you're still not done with it.
