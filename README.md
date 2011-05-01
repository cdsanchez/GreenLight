**GreenLight** is a JavaScript form validation library that lets you create rules for your forms in a declarative fashion.

I made this library when I was first learning JavaScript, please keep that in mind if you look through the source.

I imported this repository from Google Code. My documentation was in the Google Code Wiki which I'm unable to transfer here because the format doesn't play nice with github.

You can find some of the documentation [here](http://code.google.com/p/greenlight/w/list).

Here are a few reasons why you would want to use this library:

- A simple and flexible library for validating your forms.
- Has no dependencies on other libraries.
- Relatively small when minified and gzipped.
- Offers a nice declarative API for building constraints (rules).
- i18n support.

Here are a few reasons why you **wouldn't** want use this library:

- No extensive testing. Though it worked fine in most of my own scenarios, I didn't test this library methodically.
- No support for constraints that are dependant on asynchronous operations.
- The naming of public methods could be better.
- No support for context-aware errors (it won't report which specific rule it did not pass).
- Browser vendors are beginning to add native validation controls to input fields. Why would you want to use a library?

What I would change:

- Rework constraints to allow asynchronous operations.
- Make errors rule-specific rather than field-specific.
- Re-evaluate the structure of the library as well as the patterns in it.
- Make API dead simple and intuitive (though it's not **that** bad as it is).
