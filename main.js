import { AckPolicy, AdvisoryKind, connect, consumerOpts, nuid } from "nats";
import { delay } from "nats/lib/nats-base-client/util.js";

const nc = await connect({
  port: 4222,
  reconnect: true,
  maxReconnectAttempts: -1,
});
const jsm = await nc.jetstreamManager();

(async () => {
  for await (const a of jsm.advisories()) {
    switch (a.kind) {
      case AdvisoryKind.StreamLeaderElected:
      case AdvisoryKind.ConsumerLeaderElected: {
        const data = a.data;
        const { leader } = data;
        const replicas = data.replicas?.length;
        console.log(`${a.kind}: ${leader}: ${replicas} replicas`);
        break;
      }
      default:
        console.log(a.kind);
    }
  }
})().then();

const subj = nuid.next();
const stream = subj;
await jsm.streams.add({ name: subj, subjects: [subj], num_replicas: 3 });

const js = nc.jetstream();
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
  sub.pull({ expires: 500, batch: 2 });
}, 500);

(async () => {
  for await (const s of nc.status()) {
    console.log(s);
  }
})();
