from appwrite.client import Client
from appwrite.services.storage import Storage
from appwrite.services.databases import Databases



# TODO Modify later
ProjectID = "67ae6af0000e9604ffc5"
ProjectAPI_KEY = "standard_246fd8a56dd27fedd6d7d37763d4c132f880df8e063d18cd30c6e908510273c088507dba42cf1d902d8d690910e37e7dfddd844478f39c4a4318d625d2d5e35fed78fb13d512606ec70d73ad40ddfaae1ad8178d9621fcfd3bdc2059bdd0d380fa743feddb277924bde714da267fb1a4c727eaa876d099697414109f8e17d677"

# ---
client = Client()
client.set_endpoint('https://cloud.appwrite.io/v1')
client.set_project(ProjectID)
client.set_key(ProjectAPI_KEY)

# ---
databases = Databases(client)

