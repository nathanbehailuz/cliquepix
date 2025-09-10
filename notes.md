## TODO: Add a project name here (cliquepix makes sense for now)
Tech stack: MERN stack project 
Description:
    - A pic + video sharing platform exclusively for the people you know! 
    - Solely for your friends. A friend is some one who you know it's f-key
    - If Person A knows Person B's f-key and adds it to him/her as a friend, B will be A's freind and viceversa. Therefore can see media's which they 
    have shared access towards each other. 
    - You can decide who see which picture, for every single picture.

Functionalites (explained in Minimal Viable Product format)
1. visually:
    - landing page: have login and signup buttons
    - login: authenticates user based on email and password
    - signup: asks for name, email and password and generates a unique-code (f-id)
        todo: where should i store it. i.e: there should be a place where the user sees it am thinking next to user name in profile section, 
        with a hide button next to it. 
        - the f-id will be alerted(maybe in another way) to user when signing up for the first time
    - Home: have the following parts:
        - filter-dropdown (maybe named "uploaded-by"): with options me, friend 1, friend 2 ... 
        - search form (to be done last): uses Machine learning apis or a small self made one (i mean like ResNet) to identify between friends.
            todos: 
                - how should labeling people be done? may be a seperate page dedicated for that?
        - friend's List: on the top right corner, the web app lists all the user's friends. clicking that shows pictures shared by that specific friend. 
    - Create: is a big upload from computer button 
        todo: should i add some stuff here? 
    - Add a friend: a form asking for email and f-id 
    - Profile: in instagram fashion, shows 
        - name of user
        - f-id with a hide button 
        - number of posts and friends
        - upload button -> redirects to create page
        - clicking friends list gives a mini popup page that lists them next to a delete button
        below that there will be a all the pictures posted by user, just before that, there will be some buttons 
        +---+                                           +-------------------+  +------------+
        |   | All                          Visible to:  |  dropdown btn     |  | filter btn |
        +---+                                           +-------------------+  +------------+

2. Logic wise (implementation wise):
    - I wanna use classes, sth like: 
        - A User class:
            - holds name, email, password
            - list of _id of media uploaded by user
        - Media class:
            - holds a picture or video (todo: should i make it seperate classes + inheritance stuff)
            - plus thinking of storing the medias in google cloud, so the thing we store might be a link to that, but this causes the question, can i display 
            the images directly in my web app (sth like an embedded fashion?)
            - plus the owner,should use its _id i guess
            - list of users that have access to it

    Schema decision:
    - Reference based
        - Person 
        - Media
    (the schemas will be integrated with the classes and will more or less have the same fuctionalities)


The followings are things i need to figure out:
    1. how should I implement the functionality of updating access to a media 
        - should I implement the functionality of selecting a media and and update-access button comes up which can be used to checkmark friends having access? 
        or any better idea? 
    2. integrating bootstrap with react


nz2212: linserv1.cims.nyu.edu... port 12196
nathannz2212

ssh nz2212@access.cims.nyu.edu

KqC>FdcD45vB<v

ssh nz2212@linserv1.cims.nyu.edu


node
mongodb+srv://nz2212:nathannz2212@cluster0.4bfi9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

mongosh "mongodb+srv://cluster0.4bfi9.mongodb.net/" --apiVersion 1 --username nz2212

linserv1.cims.nyu.edu:12196

http://linserv1.cims.nyu.edu:12196


PORT=12196


MONGODB_URI=mongodb+srv://nz2212:nathannz2212@cluster0.4bfi9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0



