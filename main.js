import { AckPolicy, connect, consumerOpts, nuid } from "nats";
import { delay } from "nats/lib/nats-base-client/util.js";

let nc = await connect({
  port: 4222,
  reconnect: true,
  maxReconnectAttempts: -1,
});
const jsm = await nc.jetstreamManager();
const subj = nuid.next();
const stream = subj;
await jsm.streams.add({ name: subj, subjects: [subj], num_replicas: 3 });

const si = await jsm.streams.info(stream);

let js = nc.jetstream();
const data = [];
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
    });
}, 1000);

(async () => {
  for await (const s of nc.status()) {
    console.log(s);
  }
})();

await delay(50000);
