from google.cloud import firestore

class FirestoreService:
    def __init__(self):
        self.db = firestore.Client()

    def create_ticket(self, ticket_data: dict) -> str:
        doc_ref = self.db.collection("tickets").document()
        doc_ref.set(ticket_data)
        return doc_ref.id

    def get_ticket(self, ticket_id: str) -> dict:
        doc_ref = self.db.collection("tickets").document(ticket_id)
        doc = doc_ref.get()
        if doc.exists:
            return doc.to_dict()
        return None

    def update_ticket(self, ticket_id: str, ticket_data: dict) -> bool:
        doc_ref = self.db.collection("tickets").document(ticket_id)
        if not doc_ref.get().exists:
            return False
        doc_ref.update(ticket_data)
        return True

    def delete_ticket(self, ticket_id: str) -> bool:
        doc_ref = self.db.collection("tickets").document(ticket_id)
        if not doc_ref.get().exists:
            return False
        doc_ref.delete()
        return True
