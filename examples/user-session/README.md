# User Session

This sample demonstrates how to generate a user session table and client.

It uses a simple primary key, has a built-in TTL, and, somewhat uniquely for
DynamoDB, does all reads consistently.

The following actions can be performed on a `UserSession`:

-   create - when a user logs in
-   delete - when a user logs out
-   read - any time a user's data is needed
-   touch - any time a user's data is needed (to extend the TTL)
-   update - when a user does something that needs to be persisted
