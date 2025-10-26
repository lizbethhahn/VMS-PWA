using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using MudBlazor.Services;
using VMS;
using VMS.Components;

var builder = WebAssemblyHostBuilder.CreateDefault(args);

// Mount points (we'll wire #app in the host page next)
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

// Services
builder.Services.AddMudServices();

// Run client-side (no server pipeline)
await builder.Build().RunAsync();