from langchain.text_splitter import RecursiveCharacterTextSplitter

def create_chunks(text):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=150,
        length_function=len
    )

    chunks = splitter.split_text(text)

    return chunks