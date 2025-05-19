using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Colibri.Job.Options
{
    public class AzureOptions
    {
        public const string Path = "Azure:ServiceBus";
        public string Name { get; set; } = string.Empty;
        public string ConnectionString { get; set; } = string.Empty;
        public string Topic { get; set; } = string.Empty;
        public string Subscription { get; set; } = string.Empty;
    }
}
