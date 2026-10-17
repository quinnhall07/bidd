export default async function (d) {
  await d.go("/?school=ua");
  await d.hold(1200);
  await d.moveTo("a[href*='gameday']");
  await d.scroll(700);
  await d.hold(1000);
}
