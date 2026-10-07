"""Resolve client addresses only across explicitly trusted proxy hops."""
import os
from ipaddress import ip_address, ip_network


def get_client_ip(request):
    peer = request.client.host if request.client else 'unknown'
    networks = []
    for entry in os.getenv('FORWARDED_ALLOW_IPS', '127.0.0.1').split(','):
        try:
            networks.append(ip_network(entry.strip(), strict=False))
        except ValueError:
            # Wildcards/hostnames do not establish a bounded trust boundary.
            continue

    def trusted(value):
        return any(value in network for network in networks)

    try:
        address = ip_address(peer)
        if not trusted(address) or not request.scope.get('headers'):
            return str(address)
        chain = [ip_address(part.strip()) for part in request.headers.get('x-forwarded-for', '').split(',')]
        for address in reversed(chain):
            if not trusted(address):
                break
        return str(address)
    except ValueError:
        return peer
