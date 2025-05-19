using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Colibri.Job.Options
{
    public class SQSOptions
    {
        public const string Path = "AWS:SQS";
        public string QUrl { get; set; } = string.Empty;
        public int MaxNumberOfMessages { get; set; }
        public int WaitTimeSeconds { get; set; }
        public string RoleArn { get; set; } = string.Empty;
        public int DurationSeconds { get; set; }
        public List<string> MessageAttributeNames { get; set; } = [];
    }
}
