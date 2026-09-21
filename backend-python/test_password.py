import bcrypt

password = b"pallavi123"

hashed_password = b"$2b$10$lRu6l7RCa/YxRXD5FTYc.eGAeceIpRP4MpjbShDS1kTjcgPxQLciC"

result = bcrypt.checkpw(password, hashed_password)

print("Password correct:", result)