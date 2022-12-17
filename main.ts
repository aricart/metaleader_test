import { connect, nuid, AckPolicy, PubAck, consumerOpts }  from "https://raw.githubusercontent.com/nats-io/nats.deno/main/src/mod.ts";
import { initStream } from "https://raw.githubusercontent.com/nats-io/nats.deno/main/tests/jstest_util.ts";
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { delay } from "https://raw.githubusercontent.com/nats-io/nats.deno/main/nats-base-client/internal_mod.ts";

let nc = await connect({
  port: 4222,
  reconnect: true,
  maxReconnectAttempts: -1,
});


const { stream, subj } = await initStream(nc, nuid.next(), {
  num_replicas: 3,
});
const jsm = await nc.jetstreamManager();
const si = await jsm.streams.info(stream);
assertEquals(si.config.num_replicas, 3);

let js = nc.jetstream();
const data: Promise<PubAck>[] = [];
for (let i = 0; i < 1000; i++) {
  data.push(js.publish(subj));
}
await Promise.all(data);

await jsm.consumers.add(stream, {
  durable_name: "opts",
  num_replicas: 3,
  ack_policy: AckPolicy.Explicit,
});

const opts = consumerOpts();
opts.ackExplicit();
opts.durable("opts");
opts.numReplicas(3);

const sub = await js.pullSubscribe(subj, opts);
(async () => {
  for await (const m of sub) {
    console.log(m.seq);
    m.ack();
  }
})()
  .then(() => console.log("for await broke"))
  .catch((err) => console.log("for await caught:", err.message));
sub.closed.then(() => console.log("closed triggered"));

setInterval(() => {
  sub.pull({ expires: 1000, batch: 2 });
}, 1000);

let leader = "";
setInterval(() => {
    sub.consumerInfo().then((ci) => {
        if (leader !== ci.cluster?.leader) {
            leader = ci.cluster?.leader || "unknown";
            console.log("new leader", leader);
        }
    })
        .catch((err) => {
            console.log(`error inspecting leader: ${err.message}`);
        })
}, 1000);

(async () => {
    for await(const s of nc.status()) {
        console.log(s);
    }
})();

await delay(50000);
