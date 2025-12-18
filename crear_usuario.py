import urllib.request
import json

# 1. Configuración
url = "http://127.0.0.1:5000/api/auth/register"
datos = {
    "username": "alison",
    "password": "123"
}

# 2. Preparamos el mensaje (convertimos a JSON)
json_data = json.dumps(datos).encode('utf-8')
headers = {'Content-Type': 'application/json'}

# 3. Enviamos la solicitud
try:
    req = urllib.request.Request(url, data=json_data, headers=headers)
    with urllib.request.urlopen(req) as response:
        resultado = response.read().decode('utf-8')
        print("¡ÉXITO! Respuesta del servidor:", resultado)
except urllib.error.HTTPError as e:
    print(f"Error del servidor (código {e.code}):", e.read().decode())
except urllib.error.URLError as e:
    print("Error de conexión: Asegúrate de que 'python app.py' esté corriendo en otra terminal.")