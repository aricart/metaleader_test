# Sandbox for testing metaleader

- install [Deno](https://deno.land/): `curl -fsSL https://deno.land/x/install/install.sh | sh`
- run these commands on one terminal each:
  - `nats-server -c a.conf`
  - `nats-server -c b.conf`
  - `nats-server -c c.conf`
  - `deno run -A https://raw.githubusercontent.com/aricart/metaleader_test/main/main.ts`

The client will initially connect to the first server. Once it starts printing messages:

If it prints leader as "A", "B", or "C" proceed to kill that process for a bit, the client 
should recover, and print that it switched. You can randomly stop any of the servers
and observe the client. If more than 2 servers is down, the consumer will be stalled, but
as soon as you restart another server, you should see the sequences printing again.

