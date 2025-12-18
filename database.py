from pymongo import MongoClient

class Database:
    _client = None
    _db = None

    @classmethod
    def get_client(cls):
        if cls._client is None:
            cls._client = MongoClient("mongodb://localhost:27017/")
        return cls._client

    @classmethod
    def get_db(cls):
        if cls._db is None:
            cls._db = cls.get_client()["joyeria_db"]
        return cls._db

    @classmethod
    def get_collection(cls, collection_name):
        return cls.get_db()[collection_name]

# Instancia global
db = Database