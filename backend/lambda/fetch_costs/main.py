import boto3
import json
import datetime

sns = boto3.client('sns', region_name='us-east-1')
ce = boto3.client('ce', region_name='us-east-1')
dynamo = boto3.resource('dynamodb', region_name='us-east-1')

THRESHOLD = 0.5  # Example threshold

def lambda_handler(event, context):
    path = event.get('path', '')
    today = datetime.date.today()
    start = today - datetime.timedelta(days=7)

    try:
        if '/history' in path:
            # Fetch 7-day history
            response = ce.get_cost_and_usage(
                TimePeriod={
                    'Start': start.strftime("%Y-%m-%d"),
                    'End': today.strftime("%Y-%m-%d")
                },
                Granularity='DAILY',
                Metrics=['UnblendedCost']
            )

            history = []
            for item in response['ResultsByTime']:
                cost = round(float(item['Total']['UnblendedCost']['Amount']), 4)
                history.append({
                    'date': item['TimePeriod']['Start'],
                    'cost': cost
                })

            return {
                'statusCode': 200,
                'headers': cors_headers(),
                'body': json.dumps({'history': history})
            }

        # Default: fetch today’s latest cost
        start_month = today.replace(day=1).strftime("%Y-%m-%d")
        end = today.strftime("%Y-%m-%d")
        response = ce.get_cost_and_usage(
            TimePeriod={'Start': start_month, 'End': end},
            Granularity='DAILY',
            Metrics=['UnblendedCost']
        )

        results = response['ResultsByTime'][-1]
        amount = round(float(results['Total']['UnblendedCost']['Amount']), 4)
        if abs(amount) < 0.0001:
            amount = 0.0

        date = results['TimePeriod']['Start']
        table = dynamo.Table('aws_daily_costs')
        table.put_item(Item={'date': date, 'cost': str(amount)})

        if amount > THRESHOLD:
            message = f"🚨 Daily AWS cost alert: ${amount:.2f} on {date}"
            sns.publish(
                TopicArn="arn:aws:sns:us-east-1:433676943596:DailyCostAlert",
                Message=message,
                Subject="AWS Cost Alert"
            )

        return {
            'statusCode': 200,
            'headers': cors_headers(),
            'body': json.dumps({'date': date, 'cost': amount})
        }

    except Exception as e:
        print("Error:", str(e))
        return {
            'statusCode': 500,
            'headers': cors_headers(),
            'body': json.dumps({'error': str(e)})
        }

def cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    }
