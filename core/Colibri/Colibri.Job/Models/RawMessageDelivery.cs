using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Colibri.Job.Models
{
    public record RawMessageDelivery
    (
        string Type,
        string MessageId,
        string TopicArn,
        string Subject,
        string Message,
        DateTime Timestamp,
        string SignatureVersion,
        string Signature,
        string SigningCertURL,
        string UnsubscribeURL,
        Dictionary<string, AttributeValue> MessageAttributes
    );

    public record AttributeValue(string Type, string Value);
}
