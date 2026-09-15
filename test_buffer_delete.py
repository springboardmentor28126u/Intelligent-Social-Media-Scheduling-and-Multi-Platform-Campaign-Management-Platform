from app.integrations.buffer import BufferIntegration


BUFFER_POST_ID = "6aa7b16fe4aa27d1cb08571a"


buffer = BufferIntegration()

result = buffer.delete_post(
    BUFFER_POST_ID
)

print("Delete result:")
print(result)