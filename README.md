# Sandbox for testing metaleader

- install [Deno](https://deno.land/): `curl -fsSL https://deno.land/x/install/install.sh | sh`
- run these commands on one terminal each:
  - `nats-server -c a.conf`
  - `nats-server -c b.conf`
  - `nats-server -c c.conf`
  - `deno run -A https://raw.githubusercontent.com/aricart/metaleader_test/main/main.ts`