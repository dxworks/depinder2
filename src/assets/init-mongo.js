db = db.getSiblingDB('depinder')

db.createUser(
    {
        user: 'depinder',
        pwd: 'depinder',
        roles: [
            {
                role: 'readWrite',
                db: 'depinder',
            },
        ],
    }
)

db.intialisationCollection.insert({ initialized: true });